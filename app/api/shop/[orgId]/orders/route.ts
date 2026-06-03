import { appApiHandler } from "@/lib/app-api";
import { formatPhoneAsBase } from "@/lib/formatting";
import { getOrganizationPaymentMethodsConfig } from "@/lib/payments";
import { processSaleConfirmation } from "@/lib/sale-processing";
import { getShopCatalogProducts, type TShopCatalogProduct } from "@/lib/shop/catalog";
import { getShopAvailability } from "@/lib/shop/availability";
import { normalizeShopSettingsConfiguration } from "@/lib/shop/config";
import { CreateShopOrderInputSchema, type TShopDraftMetadata } from "@/schemas/shop";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, clientLocations, clients, saleItemModifiers, saleItems, sales, shopOrderRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

function extractOrgId(pathname: string) {
	return pathname.split("/")[3];
}

function hashShopOrderPayload(input: ReturnType<typeof CreateShopOrderInputSchema.parse>) {
	return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function getShopPaymentDescription(method: ReturnType<typeof CreateShopOrderInputSchema.parse>["pagamento"]["metodo"]) {
	const labels = {
		DINHEIRO: "Dinheiro",
		PIX: "PIX",
		CARTAO_DEBITO: "Cartão de débito",
		CARTAO_CREDITO: "Cartão de crédito",
	} as const;
	return labels[method];
}

type CalculatedModifier = {
	opcaoId: string;
	nome: string;
	quantidade: number;
	valorUnitario: number;
	valorTotal: number;
};

type CalculatedItem = {
	produtoId: string;
	produtoVarianteId: string | null;
	nome: string;
	codigo: string;
	imagemUrl: string | null;
	quantidade: number;
	valorUnitarioBase: number;
	valorModificadores: number;
	valorUnitarioFinal: number;
	valorTotalBruto: number;
	valorDesconto: number;
	valorTotalLiquido: number;
	valorCustoUnitario: number;
	valorCustoTotal: number;
	modificadores: CalculatedModifier[];
};

function getAvailableReferences(product: TShopCatalogProduct, variantId: string | null) {
	const variant = variantId ? product.variantes.find((item) => item.id === variantId) : null;
	return [...product.addOnsReferencias, ...(variant?.addOnsReferencias ?? [])];
}

function calculateShopItem({
	product,
	variantId,
	quantity,
	modifiers,
}: {
	product: TShopCatalogProduct;
	variantId: string | null;
	quantity: number;
	modifiers: Array<{ opcaoId: string; quantidade: number }>;
}): CalculatedItem {
	const variant = variantId ? product.variantes.find((item) => item.id === variantId) : null;
	if (variantId && !variant) throw new createHttpError.BadRequest("Variante não disponível para este produto.");
	if (product.variantes.length > 0 && !variant) throw new createHttpError.BadRequest("Selecione uma variante para este produto.");

	const availableReferences = getAvailableReferences(product, variantId);
	const aggregatedModifiers = new Map<string, number>();
	for (const modifier of modifiers) {
		aggregatedModifiers.set(modifier.opcaoId, (aggregatedModifiers.get(modifier.opcaoId) ?? 0) + modifier.quantidade);
	}

	for (const reference of availableReferences) {
		const group = reference.grupo;
		const selectedOptions = group.opcoes
			.map((option) => ({
				option,
				quantity: aggregatedModifiers.get(option.id) ?? 0,
			}))
			.filter((item) => item.quantity > 0);
		const selectedQuantity = selectedOptions.reduce((sum, item) => sum + item.quantity, 0);

		if (selectedQuantity < group.minOpcoes) {
			throw new createHttpError.BadRequest(`Selecione pelo menos ${group.minOpcoes} opção(ões) em ${group.nome}.`);
		}
		if (selectedQuantity > group.maxOpcoes) {
			throw new createHttpError.BadRequest(`Selecione no máximo ${group.maxOpcoes} opção(ões) em ${group.nome}.`);
		}
		for (const selected of selectedOptions) {
			if (
				selected.option.maxQtdePorItem !== null &&
				selected.option.maxQtdePorItem !== undefined &&
				selected.quantity > selected.option.maxQtdePorItem
			) {
				throw new createHttpError.BadRequest(`Quantidade máxima excedida para ${selected.option.nome}.`);
			}
		}
	}

	const optionMap = new Map(availableReferences.flatMap((reference) => reference.grupo.opcoes.map((option) => [option.id, option])));
	const calculatedModifiers: CalculatedModifier[] = [];
	for (const [optionId, modifierQuantity] of aggregatedModifiers.entries()) {
		const option = optionMap.get(optionId);
		if (!option) throw new createHttpError.BadRequest("Opção de adicional não disponível para este produto.");
		calculatedModifiers.push({
			opcaoId: option.id,
			nome: option.nome,
			quantidade: modifierQuantity,
			valorUnitario: option.precoDelta,
			valorTotal: option.precoDelta * modifierQuantity,
		});
	}

	const basePrice = variant?.precoVenda ?? product.precoVenda ?? 0;
	const modifiersPrice = calculatedModifiers.reduce((sum, modifier) => sum + modifier.valorTotal, 0);
	const unitFinal = basePrice + modifiersPrice;
	const cost = variant?.precoCusto ?? product.precoCusto ?? 0;
	const itemName = variant ? `${product.nome} - ${variant.nome}` : product.nome;

	return {
		produtoId: product.id,
		produtoVarianteId: variant?.id ?? null,
		nome: itemName,
		codigo: variant?.codigo ?? product.codigo,
		imagemUrl: variant?.imagemCapaUrl ?? product.imagemCapaUrl,
		quantidade: quantity,
		valorUnitarioBase: basePrice,
		valorModificadores: modifiersPrice,
		valorUnitarioFinal: unitFinal,
		valorTotalBruto: unitFinal * quantity,
		valorDesconto: 0,
		valorTotalLiquido: unitFinal * quantity,
		valorCustoUnitario: cost,
		valorCustoTotal: cost * quantity,
		modificadores: calculatedModifiers,
	};
}

async function getOrCreateShopClient({
	orgId,
	nome,
	cpfCnpj,
	telefone,
}: {
	orgId: string;
	nome?: string | null;
	cpfCnpj?: string | null;
	telefone: string;
}) {
	const telefoneBase = formatPhoneAsBase(telefone);
	if (!telefoneBase) throw new createHttpError.BadRequest("Telefone inválido.");

	const existingClient = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.telefoneBase, telefoneBase)),
	});
	if (existingClient) return existingClient;

	if (!nome?.trim()) throw new createHttpError.BadRequest("Nome do cliente não informado.");

	const [inserted] = await db
		.insert(clients)
		.values({
			organizacaoId: orgId,
			nome: nome.trim(),
			cpfCnpj: cpfCnpj ?? null,
			telefone,
			telefoneBase,
			email: "",
			canalAquisicao: "LOJA DIGITAL",
		})
		.returning();
	if (!inserted) throw new createHttpError.InternalServerError("Erro ao criar cliente.");
	return inserted;
}

async function createDeliveryLocation({
	orgId,
	clientId,
	address,
}: {
	orgId: string;
	clientId: string;
	address: NonNullable<ReturnType<typeof CreateShopOrderInputSchema.parse>["entrega"]["endereco"]>;
}) {
	const existing = await db.query.clientLocations.findFirst({
		where: (fields, { and, eq }) =>
			and(
				eq(fields.organizacaoId, orgId),
				eq(fields.clienteId, clientId),
				eq(fields.localizacaoLogradouro, address.localizacaoLogradouro ?? ""),
				eq(fields.localizacaoNumero, address.localizacaoNumero ?? ""),
				eq(fields.localizacaoCidade, address.localizacaoCidade ?? ""),
			),
	});
	if (existing) return existing;

	const [inserted] = await db
		.insert(clientLocations)
		.values({
			organizacaoId: orgId,
			clienteId: clientId,
			titulo: address.titulo || "Entrega loja digital",
			localizacaoCep: address.localizacaoCep ?? null,
			localizacaoEstado: address.localizacaoEstado ?? null,
			localizacaoCidade: address.localizacaoCidade ?? null,
			localizacaoBairro: address.localizacaoBairro ?? null,
			localizacaoLogradouro: address.localizacaoLogradouro ?? null,
			localizacaoNumero: address.localizacaoNumero ?? null,
			localizacaoComplemento: address.localizacaoComplemento ?? null,
		})
		.returning();
	if (!inserted) throw new createHttpError.InternalServerError("Erro ao criar localização de entrega.");
	return inserted;
}

async function validateCashbackRequest({
	orgId,
	clientId,
	saleSubtotal,
	requestedValue,
}: {
	orgId: string;
	clientId: string;
	saleSubtotal: number;
	requestedValue: number;
}) {
	if (requestedValue <= 0) return { programId: null };

	const program = await db.query.cashbackPrograms.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
	});
	if (!program) throw new createHttpError.BadRequest("Programa de cashback não encontrado.");
	if (!program.modalidadeDescontosPermitida) throw new createHttpError.BadRequest("Resgate de cashback não permitido para esta loja.");

	const balance = await db.query.cashbackProgramBalances.findFirst({
		where: and(
			eq(cashbackProgramBalances.organizacaoId, orgId),
			eq(cashbackProgramBalances.clienteId, clientId),
			eq(cashbackProgramBalances.programaId, program.id),
		),
	});
	const available = balance?.saldoValorDisponivel ?? 0;
	if (available < requestedValue) throw new createHttpError.BadRequest("Saldo insuficiente.");

	if (program.resgateLimiteTipo && program.resgateLimiteValor !== null && program.resgateLimiteValor !== undefined) {
		const maxAllowed = program.resgateLimiteTipo === "FIXO" ? program.resgateLimiteValor : (saleSubtotal * program.resgateLimiteValor) / 100;
		if (requestedValue > maxAllowed) throw new createHttpError.BadRequest("Valor de resgate excede o limite permitido.");
	}

	return { programId: program.id };
}

async function createShopOrder(request: NextRequest) {
	const orgId = extractOrgId(request.nextUrl.pathname);
	const body = await request.json();
	const input = CreateShopOrderInputSchema.parse(body);

	const [organization, settings] = await Promise.all([
		db.query.organizations.findFirst({ where: (fields, { eq }) => eq(fields.id, orgId) }),
		db.query.shopSettings.findFirst({ where: (fields, { eq }) => eq(fields.organizacaoId, orgId) }),
	]);
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");
	if (!settings || !settings.ativo) throw new createHttpError.NotFound("Loja digital indisponível.");

	const configuracoes = normalizeShopSettingsConfiguration(settings.configuracoes);
	const availability = getShopAvailability({ ativo: settings.ativo, configuracoes });
	if (availability.status !== "ABERTA") throw new createHttpError.BadRequest("Não estamos recebendo pedidos no momento.");
	if (input.entrega.modalidade === "RETIRADA" && !configuracoes.atendimento.retirada.ativo)
		throw new createHttpError.BadRequest("Retirada não disponível.");
	if (input.entrega.modalidade === "ENTREGA" && !configuracoes.atendimento.entrega.ativo)
		throw new createHttpError.BadRequest("Entrega não disponível.");

	if (!configuracoes.pagamento.metodosAceitos.includes(input.pagamento.metodo)) {
		throw new createHttpError.BadRequest("Método de pagamento não disponível para esta loja.");
	}

	const payloadHash = hashShopOrderPayload(input);
	const existingRequest = await db.query.shopOrderRequests.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.idempotencyKey, input.idempotencyKey)),
	});
	if (existingRequest) {
		if (existingRequest.payloadHash !== payloadHash) throw new createHttpError.Conflict("A chave de idempotência já foi usada com outro pedido.");
		if (existingRequest.status === "CONCLUIDO" && existingRequest.vendaId) {
			return NextResponse.json({
				data: { saleId: existingRequest.vendaId, orderNumber: existingRequest.vendaId },
				message: "Pedido enviado com sucesso.",
			});
		}
		if (existingRequest.status === "ERRO" && !existingRequest.vendaId) {
			await db.delete(shopOrderRequests).where(eq(shopOrderRequests.id, existingRequest.id));
		} else {
			throw new createHttpError.Conflict("Este pedido já está sendo processado. Aguarde e tente novamente.");
		}
	}

	const catalogProducts = await getShopCatalogProducts({ orgId, configuracoes });
	const catalogProductMap = new Map(catalogProducts.map((product) => [product.id, product]));
	const calculatedItems = input.itens.map((item) => {
		const product = catalogProductMap.get(item.produtoId);
		if (!product) throw new createHttpError.BadRequest("Produto não disponível na loja digital.");
		return calculateShopItem({
			product,
			variantId: item.produtoVarianteId ?? null,
			quantity: item.quantidade,
			modifiers: item.modificadores,
		});
	});
	const subtotal = calculatedItems.reduce((sum, item) => sum + item.valorTotalLiquido, 0);
	if (input.entrega.modalidade === "ENTREGA" && subtotal < configuracoes.atendimento.entrega.pedidoMinimo) {
		throw new createHttpError.BadRequest("Pedido mínimo para entrega não atingido.");
	}

	const client = await getOrCreateShopClient({
		orgId,
		nome: input.cliente.nome,
		cpfCnpj: input.cliente.cpfCnpj,
		telefone: input.cliente.telefone,
	});

	const deliveryLocation =
		input.entrega.modalidade === "ENTREGA" && input.entrega.endereco
			? await createDeliveryLocation({ orgId, clientId: client.id, address: input.entrega.endereco })
			: null;

	const requestedCashback = Math.min(input.cashbackResgateSolicitado, subtotal);
	const { programId } = await validateCashbackRequest({
		orgId,
		clientId: client.id,
		saleSubtotal: subtotal,
		requestedValue: requestedCashback,
	});

	const [requestRecord] = await db
		.insert(shopOrderRequests)
		.values({ organizacaoId: orgId, idempotencyKey: input.idempotencyKey, payloadHash, status: "PROCESSANDO" })
		.onConflictDoNothing()
		.returning({ id: shopOrderRequests.id });
	if (!requestRecord) throw new createHttpError.Conflict("Este pedido já está sendo processado. Aguarde e tente novamente.");

	const metadata: TShopDraftMetadata = {
		origem: "SHOP",
		modo: settings.modo,
		subtotalItens: subtotal,
		cashbackResgateSolicitado: requestedCashback,
		cashbackProgramaId: programId,
		pagamento: {
			tipo: "NO_LOCAL",
			metodo: input.pagamento.metodo,
			descricao: `${getShopPaymentDescription(input.pagamento.metodo)} na ${input.entrega.modalidade === "ENTREGA" ? "entrega" : "retirada"}`,
			observacoes: input.pagamento.observacoes ?? null,
		},
		entrega: {
			modalidade: input.entrega.modalidade,
		},
		criadoEm: new Date().toISOString(),
	};
	const saleObservations = [input.observacoes?.trim() || null, input.pagamento.observacoes?.trim() || null].filter(Boolean).join("\n") || null;

	let saleId: string | null = null;
	try {
		saleId = await db.transaction(async (tx) => {
			const [insertedSale] = await tx
				.insert(sales)
				.values({
					organizacaoId: orgId,
					clienteId: client.id,
					idExterno: `SHOP-${input.idempotencyKey}`,
					valorTotal: Math.max(0, subtotal - requestedCashback),
					descontosTotal: requestedCashback > 0 ? requestedCashback : null,
					acrescimosTotal: null,
					custoTotal: calculatedItems.reduce((sum, item) => sum + item.valorCustoTotal, 0),
					vendedorNome: "",
					vendedorId: null,
					entregaModalidade: input.entrega.modalidade,
					entregaLocalizacaoId: deliveryLocation?.id ?? null,
					observacoes: saleObservations,
					rascunhoMetadados: { shop: metadata },
					parceiro: "",
					chave: "",
					documento: "",
					modelo: "",
					movimento: "RECEITAS",
					natureza: "SN01",
					serie: "",
					situacao: "",
					tipo: "Venda de produtos",
					canal: "SHOP",
					processamentoOrigem: "INTERNO",
					statusVenda: "ORCAMENTO",
				})
				.returning({ id: sales.id, idExterno: sales.idExterno });

			if (!insertedSale) throw new createHttpError.InternalServerError("Erro ao criar pedido.");

			for (const item of calculatedItems) {
				const [insertedItem] = await tx
					.insert(saleItems)
					.values({
						organizacaoId: orgId,
						vendaId: insertedSale.id,
						clienteId: client.id,
						produtoId: item.produtoId,
						produtoVarianteId: item.produtoVarianteId,
						quantidade: item.quantidade,
						valorVendaUnitario: item.valorUnitarioFinal,
						valorCustoUnitario: item.valorCustoUnitario,
						valorVendaTotalBruto: item.valorTotalBruto,
						valorTotalDesconto: item.valorDesconto,
						valorVendaTotalLiquido: item.valorTotalLiquido,
						valorCustoTotal: item.valorCustoTotal,
						metadados: {
							nome: item.nome,
							codigo: item.codigo,
							imagemUrl: item.imagemUrl,
							produtoId: item.produtoId,
							produtoVarianteId: item.produtoVarianteId,
							valorUnitarioBase: item.valorUnitarioBase,
							valorModificadores: item.valorModificadores,
							modificadores: item.modificadores,
						},
					})
					.returning({ id: saleItems.id });
				if (!insertedItem) throw new createHttpError.InternalServerError("Erro ao criar item do pedido.");

				if (item.modificadores.length > 0) {
					await tx.insert(saleItemModifiers).values(
						item.modificadores.map((modifier) => ({
							itemVendaId: insertedItem.id,
							opcaoId: modifier.opcaoId,
							nome: modifier.nome,
							quantidade: modifier.quantidade,
							valorUnitario: modifier.valorUnitario,
							valorTotal: modifier.valorTotal,
						})),
					);
				}
			}

			await tx.update(shopOrderRequests).set({ vendaId: insertedSale.id }).where(eq(shopOrderRequests.id, requestRecord.id));
			return insertedSale.id;
		});

		const organizationSaleDefaults = organization.configuracao.defaults.contabilidade.lancamentosPadrao.vendas;
		if (!organizationSaleDefaults.debitoContaId || !organizationSaleDefaults.creditoContaId) {
			throw new createHttpError.InternalServerError("A organização não possui contas padrão de vendas configuradas.");
		}
		const paymentDefaults = getOrganizationPaymentMethodsConfig(organization.configuracao)[input.pagamento.metodo];
		if (!paymentDefaults?.suportado) throw new createHttpError.BadRequest("Método de pagamento não habilitado para esta organização.");

		await processSaleConfirmation({
			organization,
			saleId,
			salePayments: [
				{
					metodo: input.pagamento.metodo,
					valor: Math.max(0, subtotal - requestedCashback),
					efetivacaoTipo: "PENDENTE",
					dataPrevisao: new Date(),
					observacoes: input.pagamento.observacoes ?? metadata.pagamento.descricao,
					contaFinanceiraPadraoId: paymentDefaults.contaFinanceiraPadraoId ?? null,
				},
			],
			saleAuthorId: null,
			saleClientId: client.id,
			saleCashbackProgramId: programId,
			saleCashbackRedemptionValue: requestedCashback,
			accountingEntryDebitAccountId: organizationSaleDefaults.debitoContaId,
			accountingEntryCreditAccountId: organizationSaleDefaults.creditoContaId,
			initialAttendanceStatus: "NAO_INICIADO",
			accumulateCashback: false,
			emitFiscal: false,
		});

		await db.update(shopOrderRequests).set({ status: "CONCLUIDO", erro: null }).where(eq(shopOrderRequests.id, requestRecord.id));
	} catch (error) {
		await db
			.update(shopOrderRequests)
			.set({ status: "ERRO", vendaId: saleId, erro: error instanceof Error ? error.message : "Erro desconhecido." })
			.where(eq(shopOrderRequests.id, requestRecord.id));
		throw error;
	}

	return NextResponse.json({
		data: {
			saleId: saleId!,
			orderNumber: saleId!,
		},
		message: "Pedido enviado com sucesso.",
	});
}
export type TCreateShopOrderOutput = Awaited<ReturnType<typeof createShopOrder>> extends NextResponse<infer T> ? T : never;

export const POST = appApiHandler({ POST: createShopOrder });
