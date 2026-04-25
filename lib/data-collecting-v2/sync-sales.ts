import type { TCanonicalImportBatch, TCanonicalSale, TCanonicalSaleItem } from "@/lib/data-connectors";
import { clients, saleItemModifiers, saleItems, sales } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCanonicalClientResolutionKey, resolveClientForCanonicalSale } from "./sync-auxiliary-entities";
import type { TDataCollectingV2Executor, TPersistedSaleForEffects, TResolvedAuxiliaryEntities, TResolvedClientForImport } from "./types";

function getSellerId(context: TResolvedAuxiliaryEntities, sale: TCanonicalSale) {
	return sale.seller?.identifier ? (context.sellersByIdentifier.get(sale.seller.identifier) ?? null) : null;
}

function getPartner(context: TResolvedAuxiliaryEntities, sale: TCanonicalSale) {
	return sale.partnerIdentifier ? (context.partnersByIdentifier.get(sale.partnerIdentifier) ?? null) : null;
}

function getProductId(context: TResolvedAuxiliaryEntities, item: TCanonicalSaleItem) {
	return context.productsByCode.get(item.productCode);
}

function buildSaleValues({
	batch,
	sale,
	clientId,
	sellerId,
	partnerId,
}: {
	batch: TCanonicalImportBatch;
	sale: TCanonicalSale;
	clientId: string | null;
	sellerId: string | null;
	partnerId: string | null;
}) {
	return {
		organizacaoId: batch.organizationId,
		idExterno: sale.sourceSaleId,
		clienteId: clientId,
		valorTotal: sale.totalValue,
		descontosTotal: sale.totalDiscount,
		acrescimosTotal: sale.totalSurcharge,
		custoTotal: sale.totalCost,
		vendedorNome: sale.sellerName,
		vendedorId: sellerId,
		parceiro: sale.partnerIdentifier ?? "N/A",
		parceiroId: partnerId,
		chave: sale.key,
		documento: sale.document,
		modelo: sale.model,
		movimento: sale.movement,
		natureza: sale.nature,
		serie: sale.series,
		situacao: sale.statusText,
		tipo: sale.type,
		canal: sale.channel,
		entregaModalidade: sale.deliveryMode,
		observacoes: sale.notes,
		dataVenda: sale.occurredAt,
		processamentoOrigem: "EXTERNO" as const,
	};
}

async function insertSaleItems({
	tx,
	batch,
	context,
	saleId,
	clientId,
	items,
}: {
	tx: TDataCollectingV2Executor;
	batch: TCanonicalImportBatch;
	context: TResolvedAuxiliaryEntities;
	saleId: string;
	clientId: string | null;
	items: TCanonicalSaleItem[];
}) {
	for (const item of items) {
		const productId = getProductId(context, item);
		if (!productId) continue;

		const inserted = await tx
			.insert(saleItems)
			.values({
				organizacaoId: batch.organizationId,
				vendaId: saleId,
				clienteId: clientId,
				produtoId: productId,
				quantidade: item.quantity,
				valorVendaUnitario: item.unitSaleValue,
				valorCustoUnitario: item.unitCostValue,
				valorVendaTotalBruto: item.grossSaleValue,
				valorTotalDesconto: item.discountValue,
				valorVendaTotalLiquido: item.netSaleValue,
				valorCustoTotal: item.totalCostValue,
				metadados: item.metadata,
			})
			.returning({ id: saleItems.id });

		for (const modifier of item.modifiers ?? []) {
			await tx.insert(saleItemModifiers).values({
				itemVendaId: inserted[0].id,
				opcaoId: context.productAddOnOptionsByExternalId.get(modifier.optionExternalId),
				nome: modifier.name ?? modifier.optionExternalId,
				quantidade: modifier.quantity,
				valorUnitario: modifier.unitValue,
				valorTotal: modifier.quantity * modifier.unitValue,
			});
		}
	}
}

async function updateClientMetrics({
	tx,
	client,
	sale,
	saleId,
	isFirstPurchase,
}: {
	tx: TDataCollectingV2Executor;
	client: TResolvedClientForImport;
	sale: TCanonicalSale;
	saleId: string;
	isFirstPurchase: boolean;
}) {
	if (!sale.isValidSale) return { totalPurchaseCount: null, totalPurchaseValue: null };

	const totalPurchaseCount = client.metadataTotalPurchases + 1;
	const totalPurchaseValue = client.metadataTotalPurchaseValue + sale.totalValue;

	await tx
		.update(clients)
		.set({
			ultimaCompraData: sale.occurredAt,
			ultimaCompraId: saleId,
			primeiraCompraData: isFirstPurchase ? sale.occurredAt : undefined,
			primeiraCompraId: isFirstPurchase ? saleId : undefined,
			metadataTotalCompras: totalPurchaseCount,
			metadataValorTotalCompras: totalPurchaseValue,
			metadataUltimaAtualizacao: new Date(),
		})
		.where(eq(clients.id, client.id));

	client.metadataTotalPurchases = totalPurchaseCount;
	client.metadataTotalPurchaseValue = totalPurchaseValue;

	return { totalPurchaseCount, totalPurchaseValue };
}

export async function syncSales({
	tx,
	batch,
	context,
}: {
	tx: TDataCollectingV2Executor;
	batch: TCanonicalImportBatch;
	context: TResolvedAuxiliaryEntities;
}): Promise<TPersistedSaleForEffects[]> {
	const saleSourceIds = batch.sales.map((sale) => sale.sourceSaleId);
	const existingSales =
		saleSourceIds.length > 0
			? await tx.query.sales.findMany({
					where: and(eq(sales.organizacaoId, batch.organizationId), inArray(sales.idExterno, saleSourceIds)),
					columns: {
						id: true,
						idExterno: true,
						natureza: true,
						valorTotal: true,
					},
				})
			: [];
	const existingSalesBySourceId = new Map(existingSales.map((sale) => [sale.idExterno, sale]));
	const persistedSales: TPersistedSaleForEffects[] = [];
	const firstValidSaleByClientKey = new Map<string, { sourceSaleId: string; occurredAt: Date }>();

	for (const sale of batch.sales) {
		if (!sale.isValidSale) continue;

		const clientKey = getCanonicalClientResolutionKey(batch, sale.client);
		if (!clientKey) continue;

		const currentFirstSale = firstValidSaleByClientKey.get(clientKey);
		if (!currentFirstSale || sale.occurredAt.getTime() < currentFirstSale.occurredAt.getTime()) {
			firstValidSaleByClientKey.set(clientKey, {
				sourceSaleId: sale.sourceSaleId,
				occurredAt: sale.occurredAt,
			});
		}
	}

	for (const sale of batch.sales) {
		const client = resolveClientForCanonicalSale(batch, context, sale.client);
		const clientId = client?.id ?? null;
		const sellerId = getSellerId(context, sale);
		const partner = getPartner(context, sale);
		const existingSale = existingSalesBySourceId.get(sale.sourceSaleId);
		const saleValues = buildSaleValues({ batch, sale, clientId, sellerId, partnerId: partner?.id ?? null });

		let saleId: string;
		let isNewSale = false;
		const previouslyValid = existingSale ? existingSale.natureza === "SN01" && existingSale.valorTotal > 0 : false;
		const nowCanceled = sale.isCanceled;
		const clientKey = getCanonicalClientResolutionKey(batch, sale.client);

		if (!existingSale) {
			isNewSale = true;
			const inserted = await tx.insert(sales).values(saleValues).returning({ id: sales.id });
			saleId = inserted[0].id;
			await insertSaleItems({ tx, batch, context, saleId, clientId, items: sale.items });
		} else {
			saleId = existingSale.id;
			await tx.update(sales).set(saleValues).where(eq(sales.id, existingSale.id));

			if (batch.policies.saleItemRewritePolicy === "REPLACE_ON_EVERY_SYNC") {
				await tx.delete(saleItems).where(and(eq(saleItems.vendaId, existingSale.id), eq(saleItems.organizacaoId, batch.organizationId)));
				await insertSaleItems({ tx, batch, context, saleId, clientId, items: sale.items });
			}
		}

		const isFirstPurchase =
			!!client && client.isNew && sale.isValidSale && isNewSale && !!clientKey && firstValidSaleByClientKey.get(clientKey)?.sourceSaleId === sale.sourceSaleId;
		const totals = client && isNewSale ? await updateClientMetrics({ tx, client, sale, saleId, isFirstPurchase }) : { totalPurchaseCount: null, totalPurchaseValue: null };

		persistedSales.push({
			id: saleId,
			sourceSaleId: sale.sourceSaleId,
			clientId,
			partnerClientId: partner?.clientId ?? null,
			sale,
			isNewSale,
			isNewClient: client?.isNew ?? false,
			isFirstPurchase,
			previouslyValid,
			nowCanceled,
			newTotalPurchaseCount: totals.totalPurchaseCount,
			newTotalPurchaseValue: totals.totalPurchaseValue,
		});
	}

	return persistedSales;
}
