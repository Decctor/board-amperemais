import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveSaleFiscalEmissionOverride } from "@/lib/sales/sale-fiscal-emission-override";
import { validateSaleItemsPricing } from "@/lib/sales/sale-pricing-validation";
import { AppliedCouponSchema } from "@/schemas/coupons";
import { db } from "@/services/drizzle";
import { saleItemModifiers, saleItems, sales } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const CartItemModifierInputSchema = z.object({
	opcaoId: z.string({ required_error: "ID da opção não informado." }),
	nome: z.string({ required_error: "Nome do modificador não informado." }),
	quantidade: z.number({ required_error: "Quantidade do modificador não informada." }),
	valorUnitario: z.number({ required_error: "Valor unitário do modificador não informado." }),
	valorTotal: z.number({ required_error: "Valor total do modificador não informado." }),
});

const CartItemInputSchema = z.object({
	produtoId: z.string({ required_error: "ID do produto não informado." }),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo não válido para ID da variante." }).optional().nullable(),
	nome: z.string({ required_error: "Nome do item não informado." }),
	codigo: z.string({ required_error: "Código do item não informado." }),
	imagemUrl: z.string({ invalid_type_error: "Tipo não válido para URL da imagem." }).optional().nullable(),
	quantidade: z.number({ required_error: "Quantidade não informada." }).min(1),
	valorUnitarioBase: z.number({ required_error: "Valor unitário base não informado." }),
	valorModificadores: z.number({ required_error: "Valor de modificadores não informado." }),
	valorUnitarioFinal: z.number({ required_error: "Valor unitário final não informado." }),
	valorTotalBruto: z.number({ required_error: "Valor total bruto não informado." }),
	valorDesconto: z.number({ invalid_type_error: "Tipo não válido para desconto." }).default(0),
	valorTotalLiquido: z.number({ required_error: "Valor total líquido não informado." }),
	modificadores: z.array(CartItemModifierInputSchema),
});

const CreateSaleDraftInputSchema = z.object({
	clienteId: z.string({ invalid_type_error: "Tipo não válido para ID do cliente." }).optional().nullable(),
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para ID do vendedor." }).optional().nullable(),
	vendedorNome: z.string({ invalid_type_error: "Tipo não válido para nome do vendedor." }).optional().nullable(),
	entregaModalidade: z.enum(["PRESENCIAL", "RETIRADA", "ENTREGA", "COMANDA"]).optional().nullable(),
	entregaLocalizacaoId: z.string({ invalid_type_error: "Tipo não válido para ID da localização." }).optional().nullable(),
	comandaNumero: z.string({ invalid_type_error: "Tipo não válido para comanda." }).optional().nullable(),
	observacoes: z.string({ invalid_type_error: "Tipo não válido para observações." }).optional().nullable(),
	descontosTotal: z.number({ invalid_type_error: "Tipo não válido para desconto." }).optional().nullable(),
	acrescimosTotal: z.number({ invalid_type_error: "Tipo não válido para acréscimo." }).optional().nullable(),
	cashbackResgate: z.number({ invalid_type_error: "Tipo não válido para resgate de cashback." }).default(0),
	cupomResgate: AppliedCouponSchema.optional().nullable(),
	rascunhoMetadados: z.unknown().optional().nullable(),
	// Override tri-state da emissão fiscal automática. null/ausente = herda a preferência da organização.
	emissaoFiscalAutomatica: z.boolean({ invalid_type_error: "Tipo não válido para emissão fiscal automática." }).optional().nullable(),
	itens: z.array(CartItemInputSchema).min(1, { message: "Pelo menos um item é obrigatório." }),
});
export type TCreateSaleDraftInput = z.infer<typeof CreateSaleDraftInputSchema>;

const GetSaleDraftInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
});

const UpdateSaleDraftInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para ID do vendedor." }).optional().nullable(),
	vendedorNome: z.string({ invalid_type_error: "Tipo não válido para nome do vendedor." }).optional().nullable(),
	entregaModalidade: z.enum(["PRESENCIAL", "RETIRADA", "ENTREGA", "COMANDA"]).optional().nullable(),
	entregaLocalizacaoId: z.string({ invalid_type_error: "Tipo não válido para ID da localização." }).optional().nullable(),
	comandaNumero: z.string({ invalid_type_error: "Tipo não válido para comanda." }).optional().nullable(),
	observacoes: z.string({ invalid_type_error: "Tipo não válido para observações." }).optional().nullable(),
	descontosTotal: z.number({ invalid_type_error: "Tipo não válido para desconto." }).optional().nullable(),
	acrescimosTotal: z.number({ invalid_type_error: "Tipo não válido para acréscimo." }).optional().nullable(),
	cashbackResgate: z.number({ invalid_type_error: "Tipo não válido para resgate de cashback." }).default(0),
	cupomResgate: AppliedCouponSchema.optional().nullable(),
	rascunhoMetadados: z.unknown().optional().nullable(),
	// Override tri-state da emissão fiscal automática. Ausente = não altera; null = herda a organização.
	emissaoFiscalAutomatica: z.boolean({ invalid_type_error: "Tipo não válido para emissão fiscal automática." }).optional().nullable(),
});
export type TUpdateSaleDraftInput = z.infer<typeof UpdateSaleDraftInputSchema>;

// ============================================================================
// HELPERS
// ============================================================================

function getSessionWithOrg(session: TAuthUserSession | null) {
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return session;
}

// ============================================================================
// POST — Create draft sale (ORCAMENTO)
// ============================================================================

async function createSaleDraft({ input, session }: { input: TCreateSaleDraftInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	// Nunca confie nos valores do cliente: recalcula os itens contra o catálogo antes de qualquer uso.
	await validateSaleItemsPricing({ orgId, itens: input.itens });

	// Override fiscal por venda: valida permissão simétrica e resolve o valor a persistir (null = herda org).
	const emissaoFiscalAutomatica = resolveSaleFiscalEmissionOverride({
		requested: input.emissaoFiscalAutomatica,
		organizationDefault: session.membership!.organizacao.fiscalEmissaoAutomatica,
		session,
	});

	// Fetch product cost prices for all items
	const productIds = [...new Set(input.itens.map((i) => i.produtoId))];
	const variantIds = input.itens.map((i) => i.produtoVarianteId).filter((id): id is string => !!id);

	const [produtosResult, variantesResult] = await Promise.all([
		productIds.length > 0
			? db.query.products.findMany({
					where: (fields, { inArray }) => inArray(fields.id, productIds),
					columns: { id: true, precoCusto: true, codigo: true },
				})
			: [],
		variantIds.length > 0
			? db.query.productVariants.findMany({
					where: (fields, { inArray }) => inArray(fields.id, variantIds),
					columns: { id: true, precoCusto: true, codigo: true },
				})
			: [],
	]);

	const productCostMap = new Map(produtosResult.map((p) => [p.id, p.precoCusto ?? 0]));
	const variantCostMap = new Map(variantesResult.map((v) => [v.id, v.precoCusto ?? 0]));

	// Calculate totals
	const valorBaseItens = input.itens.reduce((sum, item) => sum + item.valorTotalLiquido, 0);
	const descontosTotalItens = input.itens.reduce((sum, item) => sum + item.valorDesconto, 0);
	const descontosGerais = input.descontosTotal ?? 0;
	const cupomDesconto = input.cupomResgate?.valorDesconto ?? 0;
	const descontosVenda = descontosGerais + cupomDesconto + input.cashbackResgate;
	const acrescimosGerais = input.acrescimosTotal ?? 0;
	const valorAntesCupom = Math.max(0, valorBaseItens - descontosGerais + acrescimosGerais);
	if (cupomDesconto > valorAntesCupom) {
		throw new createHttpError.BadRequest("O desconto do cupom não pode superar o valor da venda.");
	}
	const valorAntesCashback = Math.max(0, valorAntesCupom - cupomDesconto);
	if (input.cashbackResgate > valorAntesCashback) {
		throw new createHttpError.BadRequest("O resgate de cashback não pode superar o valor da venda.");
	}
	const valorTotal = Math.max(0, valorBaseItens - descontosVenda + acrescimosGerais);
	const custoTotal = input.itens.reduce((sum, item) => {
		const custo = item.produtoVarianteId ? (variantCostMap.get(item.produtoVarianteId) ?? 0) : (productCostMap.get(item.produtoId) ?? 0);
		return sum + custo * item.quantidade;
	}, 0);

	const idExterno = `POS-${Date.now()}`;

	// Create sale + items in a transaction
	const result = await db.transaction(async (tx) => {
		const [sale] = await tx
			.insert(sales)
			.values({
				organizacaoId: orgId,
				clienteId: input.clienteId ?? null,
				idExterno,
				valorTotal,
				descontosTotal: descontosVenda > 0 ? descontosVenda : descontosTotalItens > 0 ? descontosTotalItens : null,
				acrescimosTotal: input.acrescimosTotal ?? null,
				custoTotal,
				vendedorNome: input.vendedorNome ?? session.user.nome,
				vendedorId: input.vendedorId ?? null,
				entregaModalidade: input.entregaModalidade ?? null,
				entregaLocalizacaoId: input.entregaLocalizacaoId ?? null,
				comandaNumero: input.comandaNumero ?? null,
				observacoes: input.observacoes ?? null,
				rascunhoMetadados: {
					...((input.rascunhoMetadados as Record<string, unknown> | null) ?? {}),
					cupom: input.cupomResgate ?? null,
				},
				parceiro: "",
				chave: "",
				documento: "",
				modelo: "",
				movimento: "RECEITAS",
				natureza: "",
				serie: "",
				situacao: "",
				tipo: "Venda de produtos",
				canal: "POS",
				processamentoOrigem: "INTERNO",
				statusVenda: "ORCAMENTO",
				emissaoFiscalAutomatica,
			})
			.returning({ id: sales.id });

		// Create sale items
		const insertedItems = [];
		for (const item of input.itens) {
			const valorCustoUnitario = item.produtoVarianteId ? (variantCostMap.get(item.produtoVarianteId) ?? 0) : (productCostMap.get(item.produtoId) ?? 0);

			const [saleItem] = await tx
				.insert(saleItems)
				.values({
					organizacaoId: orgId,
					vendaId: sale.id,
					clienteId: input.clienteId ?? null,
					produtoId: item.produtoId,
					produtoVarianteId: item.produtoVarianteId ?? null,
					quantidade: item.quantidade,
					valorVendaUnitario: item.valorUnitarioFinal,
					valorCustoUnitario,
					valorVendaTotalBruto: item.valorTotalBruto,
					valorTotalDesconto: item.valorDesconto,
					valorVendaTotalLiquido: item.valorTotalLiquido,
					valorCustoTotal: valorCustoUnitario * item.quantidade,
					metadados: {
						nome: item.nome,
						codigo: item.codigo,
						imagemUrl: item.imagemUrl ?? null,
						produtoId: item.produtoId,
						produtoVarianteId: item.produtoVarianteId ?? null,
						valorUnitarioBase: item.valorUnitarioBase,
						valorModificadores: item.valorModificadores,
						modificadores: item.modificadores.map((mod) => ({
							opcaoId: mod.opcaoId,
							nome: mod.nome,
							quantidade: mod.quantidade,
							valorUnitario: mod.valorUnitario,
							valorTotal: mod.valorTotal,
						})),
					},
				})
				.returning({ id: saleItems.id });

			// Create modifiers
			if (item.modificadores.length > 0) {
				await tx.insert(saleItemModifiers).values(
					item.modificadores.map((mod) => ({
						itemVendaId: saleItem.id,
						opcaoId: mod.opcaoId,
						nome: mod.nome,
						quantidade: mod.quantidade,
						valorUnitario: mod.valorUnitario,
						valorTotal: mod.valorTotal,
					})),
				);
			}

			insertedItems.push(saleItem);
		}

		return { saleId: sale.id, itemCount: insertedItems.length };
	});

	return {
		data: { saleId: result.saleId, itemCount: result.itemCount },
		message: "Rascunho de venda criado com sucesso.",
	};
}
export type TCreateSaleDraftOutput = Awaited<ReturnType<typeof createSaleDraft>>;

// ============================================================================
// GET — Get draft sale by ID
// ============================================================================

async function getSaleDraft({ input, session }: { input: { id: string }; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, orgId)),
		with: {
			itens: {
				with: {
					adicionais: true,
					produto: {
						columns: { id: true, nome: true, codigo: true, imagemCapaUrl: true },
					},
					produtoVariante: {
						columns: { id: true, nome: true, codigo: true, imagemCapaUrl: true },
					},
				},
			},
			cliente: {
				columns: { id: true, nome: true, telefone: true },
			},
			entregaLocalizacao: true,
		},
	});

	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");
	// Rascunho de conta de atendimento não passa pelo fluxo comum de orçamento (invariante 11):
	// os totais são recalculados pelo módulo de tabs e o fechamento é a única confirmação.
	if (sale.tabId) throw new createHttpError.BadRequest("Esta venda pertence a uma conta de atendimento. Gerencie-a pelo board de Mesas & Comandas.");

	return {
		data: { sale },
		message: "Venda encontrada.",
	};
}
export type TGetSaleDraftOutput = Awaited<ReturnType<typeof getSaleDraft>>;

// ============================================================================
// PUT — Update draft sale metadata
// ============================================================================

async function updateSaleDraft({ input, session }: { input: TUpdateSaleDraftInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	// Verify the sale exists and belongs to the org
	const existing = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, orgId)),
		columns: { id: true, statusVenda: true, tabId: true },
		with: {
			itens: {
				columns: { valorVendaTotalLiquido: true },
			},
		},
	});

	if (!existing) throw new createHttpError.NotFound("Venda não encontrada.");
	if (existing.statusVenda !== "ORCAMENTO") {
		throw new createHttpError.BadRequest("Somente rascunhos (orçamentos) podem ser editados.");
	}
	// Rascunho de conta de atendimento não é editável pelo fluxo comum (invariante 11).
	if (existing.tabId) throw new createHttpError.BadRequest("Esta venda pertence a uma conta de atendimento. Gerencie-a pelo board de Mesas & Comandas.");

	// Campo ausente => não altera; presente (boolean|null) => resolve override com gate de permissão.
	const emissaoFiscalAutomatica =
		input.emissaoFiscalAutomatica !== undefined
			? resolveSaleFiscalEmissionOverride({
					requested: input.emissaoFiscalAutomatica,
					organizationDefault: session.membership!.organizacao.fiscalEmissaoAutomatica,
					session,
				})
			: undefined;

	const valorBaseItens = existing.itens.reduce((sum, item) => sum + item.valorVendaTotalLiquido, 0);
	const descontosGerais = input.descontosTotal ?? 0;
	const cupomDesconto = input.cupomResgate?.valorDesconto ?? 0;
	const descontosVenda = descontosGerais + cupomDesconto + input.cashbackResgate;
	const acrescimosVenda = input.acrescimosTotal ?? 0;
	const valorAntesCupom = Math.max(0, valorBaseItens - descontosGerais + acrescimosVenda);
	if (cupomDesconto > valorAntesCupom) {
		throw new createHttpError.BadRequest("O desconto do cupom não pode superar o valor da venda.");
	}
	const valorAntesCashback = Math.max(0, valorAntesCupom - cupomDesconto);
	if (input.cashbackResgate > valorAntesCashback) {
		throw new createHttpError.BadRequest("O resgate de cashback não pode superar o valor da venda.");
	}

	await db
		.update(sales)
		.set({
			vendedorId: input.vendedorId,
			vendedorNome: input.vendedorNome ?? undefined,
			entregaModalidade: input.entregaModalidade ?? undefined,
			entregaLocalizacaoId: input.entregaLocalizacaoId,
			comandaNumero: input.comandaNumero,
			observacoes: input.observacoes,
			valorTotal: Math.max(0, valorBaseItens - descontosVenda + acrescimosVenda),
			descontosTotal: descontosVenda > 0 ? descontosVenda : null,
			acrescimosTotal: input.acrescimosTotal,
			rascunhoMetadados: {
				...((input.rascunhoMetadados as Record<string, unknown> | null) ?? {}),
				cupom: input.cupomResgate ?? null,
			},
			emissaoFiscalAutomatica,
		})
		.where(eq(sales.id, input.id));

	return {
		data: { saleId: input.id },
		message: "Rascunho atualizado com sucesso.",
	};
}
export type TUpdateSaleDraftOutput = Awaited<ReturnType<typeof updateSaleDraft>>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function createSaleDraftRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const body = await request.json();
	const input = CreateSaleDraftInputSchema.parse(body);
	const result = await createSaleDraft({ input, session });
	return NextResponse.json(result);
}

async function getSaleDraftRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const { searchParams } = new URL(request.url);
	const input = GetSaleDraftInputSchema.parse({ id: searchParams.get("id") });
	const result = await getSaleDraft({ input, session });
	return NextResponse.json(result);
}

async function updateSaleDraftRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const { searchParams } = new URL(request.url);
	const body = await request.json();
	const input = UpdateSaleDraftInputSchema.parse({ ...body, id: searchParams.get("id") });
	const result = await updateSaleDraft({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createSaleDraftRoute });
export const GET = appApiHandler({ GET: getSaleDraftRoute });
export const PUT = appApiHandler({ PUT: updateSaleDraftRoute });
