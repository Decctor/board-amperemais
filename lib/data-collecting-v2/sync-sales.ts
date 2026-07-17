import type { TCanonicalImportBatch, TCanonicalSale, TCanonicalSaleItem } from "@/lib/data-connectors";
import { mapCanonicalSaleAttendanceStatus, mapCanonicalSaleCommercialStatus } from "@/lib/data-connectors";
import { attendanceStatusRequiresPhysicalOut, isValidAttendanceTransition } from "@/lib/sales/sale-processing/attendance";
import { isManagedFulfillmentSaleModel, type TChannelErpPolicy } from "@/lib/sales/fulfillment-channels/policy";
import { processStockDeductionIfNotDeducted } from "@/lib/sales/sale-processing/process-stock-deduction";
import { clients, saleItemModifiers, saleItems, sales } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCanonicalClientResolutionKey, resolveClientForCanonicalSale } from "./sync-auxiliary-entities";
import type { TDataCollectingV2Executor, TPersistedSaleForEffects, TResolvedAuxiliaryEntities, TResolvedClientForImport } from "./types";

export type TSyncSalesErpOptions = {
	policy: TChannelErpPolicy;
	stockTrackingEnabled: boolean;
};

/**
 * Baixa de estoque + registro de quantidade entregue para uma venda de canal gerenciado que
 * atingiu a entrega via ingestão. Roda num savepoint: falha de estoque (produto sem lote, sem
 * saldo etc.) não pode abortar a importação da organização inteira.
 */
async function applyManagedSaleDeliveryEffects({
	tx,
	organizationId,
	saleId,
}: {
	tx: TDataCollectingV2Executor;
	organizationId: string;
	saleId: string;
}) {
	const itemsForStock = await tx.query.saleItems.findMany({
		where: and(eq(saleItems.vendaId, saleId), eq(saleItems.organizacaoId, organizationId)),
		with: { adicionais: true },
	});

	try {
		await tx.transaction(async (nested) => {
			await processStockDeductionIfNotDeducted(nested, {
				organizationId,
				saleId,
				saleItems: itemsForStock,
				saleAuthorId: null,
			});
		});
	} catch (error) {
		console.error(`[SYNC_SALES] Falha na baixa de estoque da venda gerenciada ${saleId} — venda importada sem baixa.`, error);
		return;
	}

	for (const item of itemsForStock) {
		await tx.update(saleItems).set({ quantidadeEntregue: item.quantidade }).where(eq(saleItems.id, item.id));
	}
}

function getSellerId(context: TResolvedAuxiliaryEntities, sale: TCanonicalSale) {
	return sale.seller?.identifier ? (context.sellersByIdentifier.get(sale.seller.identifier) ?? null) : null;
}

function getPartner(context: TResolvedAuxiliaryEntities, sale: TCanonicalSale) {
	return sale.partnerIdentifier ? (context.partnersByIdentifier.get(sale.partnerIdentifier) ?? null) : null;
}

// Resolve o item de venda para uma variante estruturada (preferencial) ou para um produto plano.
function resolveSaleItemTarget(context: TResolvedAuxiliaryEntities, item: TCanonicalSaleItem) {
	const variant = context.variantsByCode.get(item.productCode);
	if (variant) {
		return { produtoId: variant.produtoId, produtoVarianteId: variant.produtoVarianteId, opcoes: variant.opcoes };
	}
	const produtoId = context.productsByCode.get(item.productCode);
	if (produtoId) {
		return { produtoId, produtoVarianteId: null, opcoes: [] as Array<{ eixo: string; valor: string }> };
	}
	return null;
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
		// Mapeamento conservador a partir dos sinais canonicos ja calculados por cada conector
		// (isValidSale/isCanceled). Vendas externas NAO geram efeitos de ERP na plataforma.
		statusVenda: mapCanonicalSaleCommercialStatus(sale),
		statusAtendimento: mapCanonicalSaleAttendanceStatus(sale),
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
		const target = resolveSaleItemTarget(context, item);
		if (!target) continue;

		// Snapshot dos eixos da variante no momento da venda (robusto a rename/delete posterior).
		const metadados = target.opcoes.length > 0 ? { ...(item.metadata ?? {}), opcoes: target.opcoes } : item.metadata;

		const inserted = await tx
			.insert(saleItems)
			.values({
				organizacaoId: batch.organizationId,
				vendaId: saleId,
				clienteId: clientId,
				produtoId: target.produtoId,
				produtoVarianteId: target.produtoVarianteId,
				quantidade: item.quantity,
				valorVendaUnitario: item.unitSaleValue,
				valorCustoUnitario: item.unitCostValue,
				valorVendaTotalBruto: item.grossSaleValue,
				valorTotalDesconto: item.discountValue,
				valorVendaTotalLiquido: item.netSaleValue,
				valorCustoTotal: item.totalCostValue,
				metadados,
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
	erp,
}: {
	tx: TDataCollectingV2Executor;
	batch: TCanonicalImportBatch;
	context: TResolvedAuxiliaryEntities;
	/** Política de canal da organização. Ausente = comportamento legado (sem efeitos de ERP). */
	erp?: TSyncSalesErpOptions | null;
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
						statusVenda: true,
						statusAtendimento: true,
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
		// Tornou-se válida NESTE sync: dispara os efeitos de "nova compra" exatamente uma vez por
		// venda (na próxima sincronização previouslyValid já é true, pois a natureza persiste SN01).
		const becameValid = sale.isValidSale && !previouslyValid;
		const nowCanceled = sale.isCanceled;
		const clientKey = getCanonicalClientResolutionKey(batch, sale.client);

		// Canal gerenciado: o conector informa o eixo de atendimento e a política de canal está
		// ligada — a ingestão passa a respeitar transições e a disparar os efeitos de entrega.
		const saleIsManaged = !!erp?.policy.fulfillment && isManagedFulfillmentSaleModel(sale.model) && sale.attendanceStatus != null;
		const deductStockOnDelivery = saleIsManaged && !!erp && erp.policy.estoque && erp.stockTrackingEnabled;
		let reachedDeliveryThisSync = false;

		if (!existingSale) {
			isNewSale = true;
			console.log(`[SYNC_SALES] Creating new sale of ${sale.sourceSaleId} (${sale.occurredAt.toISOString()})...`);
			const inserted = await tx.insert(sales).values(saleValues).returning({ id: sales.id });
			saleId = inserted[0].id;
			await insertSaleItems({ tx, batch, context, saleId, clientId, items: sale.items });
			// Fast-forward: venda gerenciada que já nasce entregue executa os efeitos de entrega.
			reachedDeliveryThisSync = saleIsManaged && attendanceStatusRequiresPhysicalOut(saleValues.statusAtendimento);
		} else {
			saleId = existingSale.id;
			console.log(`[SYNC_SALES] Updating existing sale of ${sale.sourceSaleId} (${sale.occurredAt.toISOString()})...`);

			const updateValues = { ...saleValues };
			if (saleIsManaged) {
				// Eixo comercial nunca regride por evento atrasado (ex.: PLACED replayed após CFM).
				if (!updateValues.statusVenda && existingSale.statusVenda) updateValues.statusVenda = existingSale.statusVenda;

				// Eixo operacional só avança por transições válidas; evento fora de ordem é ignorado.
				const currentAttendance = existingSale.statusAtendimento;
				const targetAttendance = saleValues.statusAtendimento;
				if (currentAttendance === targetAttendance) {
					updateValues.statusAtendimento = currentAttendance;
				} else if (isValidAttendanceTransition(currentAttendance, targetAttendance)) {
					reachedDeliveryThisSync = attendanceStatusRequiresPhysicalOut(targetAttendance);
				} else {
					console.log(
						`[SYNC_SALES] Transição de atendimento ignorada para ${sale.sourceSaleId}: ${currentAttendance} -> ${targetAttendance} (evento fora de ordem).`,
					);
					updateValues.statusAtendimento = currentAttendance;
				}
			}

			await tx.update(sales).set(updateValues).where(eq(sales.id, existingSale.id));
			if (batch.policies.saleItemRewritePolicy === "REPLACE_ON_EVERY_SYNC") {
				await tx.delete(saleItems).where(and(eq(saleItems.vendaId, existingSale.id), eq(saleItems.organizacaoId, batch.organizationId)));
				await insertSaleItems({ tx, batch, context, saleId, clientId, items: sale.items });
			}
		}

		if (reachedDeliveryThisSync && deductStockOnDelivery) {
			await applyManagedSaleDeliveryEffects({ tx, organizationId: batch.organizationId, saleId });
		}

		const isFirstPurchase =
			!!client && client.isNew && becameValid && !!clientKey && firstValidSaleByClientKey.get(clientKey)?.sourceSaleId === sale.sourceSaleId;
		const totals =
			client && becameValid
				? await updateClientMetrics({ tx, client, sale, saleId, isFirstPurchase })
				: { totalPurchaseCount: null, totalPurchaseValue: null };

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
			becameValid,
			nowCanceled,
			newTotalPurchaseCount: totals.totalPurchaseCount,
			newTotalPurchaseValue: totals.totalPurchaseValue,
		});
	}

	return persistedSales;
}
