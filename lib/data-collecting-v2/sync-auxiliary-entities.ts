import type { TCanonicalClient, TCanonicalImportBatch } from "@/lib/data-connectors";
import { normalizeLocation } from "@/lib/geo/brazilian-locations";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import { catalogLinks, clients, partners, productAddOnOptions, productAddOns, productVariants, products, sellers } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import type { TDataCollectingV2Executor, TResolvedAuxiliaryEntities, TResolvedClientForImport } from "./types";

function normalizeName(value?: string | null) {
	return (value ?? "").trim().toUpperCase();
}

export function getCanonicalClientResolutionKey(batch: TCanonicalImportBatch, client: TCanonicalClient | null): string | null {
	if (!client) return null;

	const nameKey = normalizeName(client.name);

	if (batch.policies.clientResolutionStrategy === "EXTERNAL_ID_THEN_PHONE") {
		return client.externalId || client.basePhone || null;
	}

	if (batch.policies.clientResolutionStrategy === "NAME_THEN_PHONE") {
		return nameKey || client.basePhone || null;
	}

	return client.externalId || client.basePhone || nameKey || null;
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string | null | undefined) {
	const map = new Map<string, T>();
	for (const value of values) {
		const key = getKey(value);
		if (!key || map.has(key)) continue;
		map.set(key, value);
	}
	return Array.from(map.values());
}

function buildResolvedClient(
	client: {
		id: string;
		nome: string;
		telefoneBase: string;
		analiseRFMTitulo: string | null;
		metadataTotalCompras: number | null;
		metadataValorTotalCompras: number | null;
	},
	isNew: boolean,
): TResolvedClientForImport {
	return {
		id: client.id,
		name: client.nome,
		basePhone: client.telefoneBase,
		rfmTitle: client.analiseRFMTitulo,
		metadataTotalPurchases: client.metadataTotalCompras ?? 0,
		metadataTotalPurchaseValue: client.metadataValorTotalCompras ?? 0,
		isNew,
	};
}

function indexClient(context: TResolvedAuxiliaryEntities, client: TResolvedClientForImport, canonicalClient?: TCanonicalClient | null) {
	if (canonicalClient?.externalId) context.clientsByExternalId.set(canonicalClient.externalId, client);

	const nameKey = normalizeName(canonicalClient?.name ?? client.name);
	if (nameKey) context.clientsByName.set(nameKey, client);

	if (canonicalClient?.basePhone || client.basePhone) {
		context.clientsByBasePhone.set(canonicalClient?.basePhone || client.basePhone, client);
	}
}

export function resolveClientForCanonicalSale(batch: TCanonicalImportBatch, context: TResolvedAuxiliaryEntities, client: TCanonicalClient | null) {
	if (!client) return null;

	if (batch.policies.clientResolutionStrategy === "EXTERNAL_ID_THEN_PHONE") {
		if (client.externalId) {
			const byExternalId = context.clientsByExternalId.get(client.externalId);
			if (byExternalId) return byExternalId;
		}

		if (client.basePhone) {
			return context.clientsByBasePhone.get(client.basePhone) ?? null;
		}

		return null;
	}

	if (batch.policies.clientResolutionStrategy === "NAME_THEN_PHONE") {
		const byName = context.clientsByName.get(normalizeName(client.name));
		if (byName) return byName;
	}

	if (client.basePhone) {
		const byPhone = context.clientsByBasePhone.get(client.basePhone);
		if (byPhone) return byPhone;
	}

	return context.clientsByName.get(normalizeName(client.name)) ?? null;
}

// Venda válida mais antiga do batch para o cliente — origem de primeiraCompraData e, quando o
// conector emite vendedores (Online Software, Bling), do autorVendedorId do cadastro
// (docs/dev-planning/client-authorship-plan.md §4.E).
function getFirstValidSaleForClient(batch: TCanonicalImportBatch, client: TCanonicalClient) {
	const clientKey = getCanonicalClientResolutionKey(batch, client);
	if (!clientKey) return null;

	const clientSales = batch.sales
		.filter((sale) => sale.isValidSale && getCanonicalClientResolutionKey(batch, sale.client) === clientKey)
		.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

	return clientSales[0] ?? null;
}

export async function syncAuxiliaryEntities({
	tx,
	batch,
}: {
	tx: TDataCollectingV2Executor;
	batch: TCanonicalImportBatch;
}): Promise<TResolvedAuxiliaryEntities> {
	const context: TResolvedAuxiliaryEntities = {
		clientsByExternalId: new Map(),
		clientsByName: new Map(),
		clientsByBasePhone: new Map(),
		productsByCode: new Map(),
		productsByExternalItemId: new Map(),
		variantsByCode: new Map(),
		sellersByIdentifier: new Map(),
		partnersByIdentifier: new Map(),
		productAddOnsByExternalId: new Map(),
		productAddOnOptionsByExternalId: new Map(),
		createdClientsCount: 0,
		createdProductsCount: 0,
		createdSellersCount: 0,
		createdPartnersCount: 0,
	};

	const existingClients = await tx.query.clients.findMany({
		where: eq(clients.organizacaoId, batch.organizationId),
		columns: {
			id: true,
			idExterno: true,
			nome: true,
			telefoneBase: true,
			analiseRFMTitulo: true,
			metadataTotalCompras: true,
			metadataValorTotalCompras: true,
		},
	});

	for (const client of existingClients) {
		const resolvedClient = buildResolvedClient(client, false);
		if (client.idExterno) context.clientsByExternalId.set(client.idExterno, resolvedClient);
		indexClient(context, resolvedClient);
	}

	// Sellers sincronizam ANTES dos clientes: o autorVendedorId do cliente novo referencia o
	// vendedor da primeira venda, que pode estar sendo criado neste mesmo batch.
	const existingSellers = await tx.query.sellers.findMany({
		where: eq(sellers.organizacaoId, batch.organizationId),
		columns: { id: true, identificador: true, nome: true },
	});
	for (const seller of existingSellers) context.sellersByIdentifier.set(seller.identificador || seller.nome, seller.id);

	for (const seller of uniqueBy(batch.sellers, (value) => value.identifier)) {
		if (context.sellersByIdentifier.has(seller.identifier)) continue;
		const inserted = await tx
			.insert(sellers)
			.values({ organizacaoId: batch.organizationId, nome: seller.name, identificador: seller.identifier })
			.returning({ id: sellers.id });
		context.sellersByIdentifier.set(seller.identifier, inserted[0].id);
		context.createdSellersCount += 1;
	}

	for (const client of uniqueBy(
		batch.sales.map((sale) => sale.client).filter((value): value is TCanonicalClient => !!value),
		(client) => `${client.externalId ?? ""}|${normalizeName(client.name)}|${client.basePhone}`,
	)) {
		if (!getCanonicalClientResolutionKey(batch, client)) continue;
		if (resolveClientForCanonicalSale(batch, context, client)) continue;

		const firstSale = getFirstValidSaleForClient(batch, client);
		const firstPurchaseDate = firstSale?.occurredAt ?? null;
		const authorSellerId = firstSale?.seller ? (context.sellersByIdentifier.get(firstSale.seller.identifier) ?? null) : null;
		// Cada conector entrega a UF num formato: a NuvemShop manda "Paraná" por extenso, o
		// CardapioWeb manda a sigla. Normalizar aqui — o ponto por onde toda integracao passa —
		// evita gravar torto e quebrar o escopo fiscal (CFOP intra vs interestadual) e os
		// filtros de publico de campanha, que casam por igualdade exata.
		const location = normalizeLocation({ estado: client.location?.state, cidade: client.location?.city });
		const inserted = await tx
			.insert(clients)
			.values({
				organizacaoId: batch.organizationId,
				autorVendedorId: authorSellerId,
				idExterno: client.externalId,
				nome: client.name,
				cpfCnpj: client.cpfCnpj,
				inscricaoEstadual: client.stateRegistration,
				telefone: client.phone,
				telefoneBase: client.basePhone,
				email: client.email,
				localizacaoCep: client.location?.cep,
				localizacaoEstado: location.estado,
				localizacaoCidade: location.cidade,
				localizacaoBairro: client.location?.neighborhood,
				localizacaoLogradouro: client.location?.street,
				localizacaoNumero: client.location?.number,
				localizacaoComplemento: client.location?.complement,
				localizacaoLatitude: client.location?.latitude,
				localizacaoLongitude: client.location?.longitude,
				primeiraCompraData: firstPurchaseDate,
				ultimaCompraData: firstPurchaseDate,
				analiseRFMTitulo: "CLIENTES RECENTES",
			})
			.returning({
				id: clients.id,
				nome: clients.nome,
				telefoneBase: clients.telefoneBase,
				analiseRFMTitulo: clients.analiseRFMTitulo,
				metadataTotalCompras: clients.metadataTotalCompras,
				metadataValorTotalCompras: clients.metadataValorTotalCompras,
			});

		const resolvedClient = buildResolvedClient(inserted[0], true);
		indexClient(context, resolvedClient, client);
		context.createdClientsCount += 1;
	}

	const existingProducts = await tx.query.products.findMany({
		where: eq(products.organizacaoId, batch.organizationId),
		columns: { id: true, codigo: true },
	});
	for (const product of existingProducts) context.productsByCode.set(product.codigo, product.id);

	// Variantes estruturadas: indexadas pelo código (SKU) para que itens de venda liguem à variante
	// certa em vez de criar um produto plano duplicado.
	const existingVariants = await tx.query.productVariants.findMany({
		where: eq(productVariants.organizacaoId, batch.organizationId),
		columns: { id: true, produtoId: true, codigo: true },
		with: {
			valoresOpcoes: {
				with: {
					opcao: { columns: { nome: true } },
					valor: { columns: { nome: true } },
				},
			},
		},
	});
	for (const variant of existingVariants) {
		if (!variant.codigo) continue;
		context.variantsByCode.set(variant.codigo, {
			produtoId: variant.produtoId,
			produtoVarianteId: variant.id,
			opcoes: variant.valoresOpcoes.map((assignment) => ({ eixo: assignment.opcao.nome, valor: assignment.valor.nome })),
		});
	}

	// Vínculos de catálogo: um item remoto já mapeado dispensa qualquer heurística de código, e
	// impede a criação de produto duplicado quando o `externalCode` do provedor não bate com o
	// `codigo` interno — origem do lixo "grupo iFood, preço nulo" no cadastro.
	const links = await tx.query.catalogLinks.findMany({
		where: and(eq(catalogLinks.organizacaoId, batch.organizationId), ne(catalogLinks.status, "DESVINCULADO")),
		columns: { produtoId: true, produtoVarianteId: true, externoItemId: true },
	});
	for (const link of links) {
		if (!link.externoItemId || !link.produtoId) continue;
		context.productsByExternalItemId.set(link.externoItemId, {
			produtoId: link.produtoId,
			produtoVarianteId: link.produtoVarianteId,
			opcoes: [],
		});
	}

	for (const product of uniqueBy(batch.products, (value) => value.code)) {
		if (context.productsByCode.has(product.code)) continue;
		// Já existe como variante estruturada: não cria produto plano duplicado.
		if (context.variantsByCode.has(product.code)) continue;
		// Já vinculado a um item remoto: o produto existe, só não é encontrável pelo código.
		if (product.externalId && context.productsByExternalItemId.has(product.externalId)) continue;
		const inserted = await tx
			.insert(products)
			.values({
				organizacaoId: batch.organizationId,
				codigo: product.code,
				nome: product.description,
				unidade: product.unit,
				grupo: product.group,
				ncm: product.ncm,
				tipo: product.type,
				dataUltimaSincronizacao: new Date(),
			})
			.returning({ id: products.id });
		context.productsByCode.set(product.code, inserted[0].id);
		context.createdProductsCount += 1;
	}

	const existingPartners = await tx.query.partners.findMany({
		where: eq(partners.organizacaoId, batch.organizationId),
		columns: { id: true, identificador: true, clienteId: true },
	});
	for (const partner of existingPartners) context.partnersByIdentifier.set(partner.identificador, { id: partner.id, clientId: partner.clienteId });

	for (const partner of uniqueBy(batch.partners, (value) => value.identifier)) {
		if (context.partnersByIdentifier.has(partner.identifier)) continue;
		const linkage = partner.clientLink
			? await linkPartnerToClient({
					tx,
					orgId: batch.organizationId,
					partner: {
						nome: partner.clientLink.name,
						cpfCnpj: partner.clientLink.cpfCnpj,
					},
					createClientIfNotFound: true,
				})
			: { clientId: null };

		const inserted = await tx
			.insert(partners)
			.values({
				organizacaoId: batch.organizationId,
				nome: partner.name,
				identificador: partner.identifier,
				codigoAfiliacao: partner.affiliateCode,
				cpfCnpj: partner.cpfCnpj,
				clienteId: linkage.clientId,
			})
			.returning({ id: partners.id });
		context.partnersByIdentifier.set(partner.identifier, { id: inserted[0].id, clientId: linkage.clientId });
		context.createdPartnersCount += 1;
	}

	const existingAddOns = await tx.query.productAddOns.findMany({
		where: eq(productAddOns.organizacaoId, batch.organizationId),
		columns: { id: true, idExterno: true },
	});
	for (const addOn of existingAddOns) {
		if (addOn.idExterno) context.productAddOnsByExternalId.set(addOn.idExterno, addOn.id);
	}

	for (const addOn of uniqueBy(batch.productAddOns, (value) => value.externalId)) {
		if (context.productAddOnsByExternalId.has(addOn.externalId)) continue;
		const inserted = await tx
			.insert(productAddOns)
			.values({
				organizacaoId: batch.organizationId,
				idExterno: addOn.externalId,
				nome: addOn.name,
				minOpcoes: addOn.minOptions,
				maxOpcoes: addOn.maxOptions,
			})
			.returning({ id: productAddOns.id });
		context.productAddOnsByExternalId.set(addOn.externalId, inserted[0].id);
	}

	const existingAddOnOptions = await tx.query.productAddOnOptions.findMany({
		where: eq(productAddOnOptions.organizacaoId, batch.organizationId),
		columns: { id: true, idExterno: true },
	});
	for (const option of existingAddOnOptions) {
		if (option.idExterno) context.productAddOnOptionsByExternalId.set(option.idExterno, option.id);
	}

	for (const option of uniqueBy(batch.productAddOnOptions, (value) => value.externalId)) {
		if (context.productAddOnOptionsByExternalId.has(option.externalId)) continue;
		const addOnId = context.productAddOnsByExternalId.get(option.addOnExternalId);
		if (!addOnId) continue;
		const inserted = await tx
			.insert(productAddOnOptions)
			.values({
				organizacaoId: batch.organizationId,
				produtoAddOnId: addOnId,
				idExterno: option.externalId,
				nome: option.name,
				codigo: option.code,
				precoDelta: option.priceDelta,
				maxQtdePorItem: option.maxQuantityPerItem,
			})
			.returning({ id: productAddOnOptions.id });
		context.productAddOnOptionsByExternalId.set(option.externalId, inserted[0].id);
	}

	return context;
}
