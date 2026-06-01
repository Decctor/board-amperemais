import { DBTransaction } from "@/services/drizzle";
import { productStockTransactions, productVariants, products, purchaseItems } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

export type TPurchaseItemStockOperation = "RECEIVING" | "UNRECEIVING" | "UPDATING_RECEIVED" | "UPDATING_UNRECEIVED";

export type TPurchaseItemInput = {
	id?: string | null;
	deletar?: boolean | null;
	produtoId: string;
	produtoVarianteId?: string | null;
	snapshotProdutoDescricao: string;
	snapshotProdutoCodigo: string;
	quantidade: number;
	valorUnitarioBruto: number;
	valorUnitarioLiquido?: number | null;
	valorTotalBruto: number;
	valorTotalLiquido?: number | null;
	descontosTotal?: number | null;
	acrescimosTotal?: number | null;
	externoQtde?: number | null;
	externoValor?: number | null;
	externoUnidade?: string | null;
	externoFatorConversao?: number | null;
	anotacoes?: string | null;
};

type HandlePurchaseItemStockProcessingParams = {
	trx: DBTransaction;
	organizationId: string;
	userId: string;
	purchaseId: string;
	operation: TPurchaseItemStockOperation;
	item: TPurchaseItemInput;
	reasonOverride?: {
		entry?: string;
		exit?: string;
	};
};

const DEFAULT_REASONS = {
	receiving: "Recebimento de compra",
	unreceiving: "Rollback - compra desfeita",
	rollbackForUpdate: "Ajuste - item de compra alterado (rollback)",
	reapplyForUpdate: "Ajuste - item de compra alterado",
} as const;

export async function handlePurchaseItemStockProcessing({
	trx,
	organizationId,
	userId,
	purchaseId,
	operation,
	item,
	reasonOverride,
}: HandlePurchaseItemStockProcessingParams) {
	const isExisting = !!item.id;
	const shouldDelete = !!item.deletar;
	const unitCost = resolveUnitCost(item);

	if (operation === "UPDATING_UNRECEIVED") {
		await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
		return;
	}

	if (operation === "RECEIVING") {
		if (isExisting && shouldDelete) {
			await deletePurchaseItemRow({ trx, organizationId, itemId: item.id! });
			return;
		}

		const persistedItemId = await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
		await applyStockEntry({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId: persistedItemId,
			item,
			unitCost,
			reason: reasonOverride?.entry ?? DEFAULT_REASONS.receiving,
		});
		return;
	}

	if (operation === "UNRECEIVING") {
		if (!isExisting) {
			await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
			return;
		}

		const previousItem = await loadPreviousItem({ trx, organizationId, itemId: item.id! });
		await applyStockExit({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId: previousItem.id,
			produtoId: previousItem.produtoId,
			produtoVarianteId: previousItem.produtoVarianteId,
			quantidade: previousItem.quantidade,
			unitCost: resolveUnitCost(previousItem),
			reason: reasonOverride?.exit ?? DEFAULT_REASONS.unreceiving,
		});

		if (shouldDelete) {
			await deletePurchaseItemRow({ trx, organizationId, itemId: item.id! });
			return;
		}
		await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
		return;
	}

	if (operation === "UPDATING_RECEIVED") {
		if (!isExisting) {
			const persistedItemId = await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
			await applyStockEntry({
				trx,
				organizationId,
				userId,
				purchaseId,
				purchaseItemId: persistedItemId,
				item,
				unitCost,
				reason: reasonOverride?.entry ?? DEFAULT_REASONS.receiving,
			});
			return;
		}

		const previousItem = await loadPreviousItem({ trx, organizationId, itemId: item.id! });
		await applyStockExit({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId: previousItem.id,
			produtoId: previousItem.produtoId,
			produtoVarianteId: previousItem.produtoVarianteId,
			quantidade: previousItem.quantidade,
			unitCost: resolveUnitCost(previousItem),
			reason: reasonOverride?.exit ?? DEFAULT_REASONS.rollbackForUpdate,
		});

		if (shouldDelete) {
			await deletePurchaseItemRow({ trx, organizationId, itemId: item.id! });
			return;
		}

		await persistPurchaseItemRow({ trx, organizationId, purchaseId, item });
		await applyStockEntry({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId: item.id!,
			item,
			unitCost,
			reason: reasonOverride?.entry ?? DEFAULT_REASONS.reapplyForUpdate,
		});
		return;
	}

	throw new createHttpError.InternalServerError("Operação de estoque de compra não suportada.");
}

function resolveUnitCost(item: { valorUnitarioLiquido?: number | null; valorUnitarioBruto: number }) {
	return item.valorUnitarioLiquido != null ? item.valorUnitarioLiquido : item.valorUnitarioBruto;
}

type PersistPurchaseItemRowParams = {
	trx: DBTransaction;
	organizationId: string;
	purchaseId: string;
	item: TPurchaseItemInput;
};

async function persistPurchaseItemRow({ trx, organizationId, purchaseId, item }: PersistPurchaseItemRowParams) {
	if (item.id) {
		await trx
			.update(purchaseItems)
			.set({
				produtoId: item.produtoId,
				produtoVarianteId: item.produtoVarianteId ?? null,
				snapshotProdutoDescricao: item.snapshotProdutoDescricao,
				snapshotProdutoCodigo: item.snapshotProdutoCodigo,
				quantidade: item.quantidade,
				valorUnitarioBruto: item.valorUnitarioBruto,
				valorUnitarioLiquido: item.valorUnitarioLiquido ?? null,
				valorTotalBruto: item.valorTotalBruto,
				valorTotalLiquido: item.valorTotalLiquido ?? null,
				descontosTotal: item.descontosTotal ?? null,
				acrescimosTotal: item.acrescimosTotal ?? null,
				externoQtde: item.externoQtde ?? null,
				externoValor: item.externoValor ?? null,
				externoUnidade: item.externoUnidade ?? null,
				externoFatorConversao: item.externoFatorConversao ?? null,
				anotacoes: item.anotacoes ?? null,
			})
			.where(and(eq(purchaseItems.id, item.id), eq(purchaseItems.organizacaoId, organizationId)));
		return item.id;
	}

	const inserted = await trx
		.insert(purchaseItems)
		.values({
			organizacaoId: organizationId,
			compraId: purchaseId,
			produtoId: item.produtoId,
			produtoVarianteId: item.produtoVarianteId ?? null,
			snapshotProdutoDescricao: item.snapshotProdutoDescricao,
			snapshotProdutoCodigo: item.snapshotProdutoCodigo,
			quantidade: item.quantidade,
			valorUnitarioBruto: item.valorUnitarioBruto,
			valorUnitarioLiquido: item.valorUnitarioLiquido ?? null,
			valorTotalBruto: item.valorTotalBruto,
			valorTotalLiquido: item.valorTotalLiquido ?? null,
			descontosTotal: item.descontosTotal ?? null,
			acrescimosTotal: item.acrescimosTotal ?? null,
			externoQtde: item.externoQtde ?? null,
			externoValor: item.externoValor ?? null,
			externoUnidade: item.externoUnidade ?? null,
			externoFatorConversao: item.externoFatorConversao ?? null,
			anotacoes: item.anotacoes ?? null,
		})
		.returning({ id: purchaseItems.id });

	const insertedId = inserted[0]?.id;
	if (!insertedId) throw new createHttpError.InternalServerError("Erro ao persistir item da compra.");
	return insertedId;
}

async function deletePurchaseItemRow({ trx, organizationId, itemId }: { trx: DBTransaction; organizationId: string; itemId: string }) {
	await trx.delete(purchaseItems).where(and(eq(purchaseItems.id, itemId), eq(purchaseItems.organizacaoId, organizationId)));
}

async function loadPreviousItem({ trx, organizationId, itemId }: { trx: DBTransaction; organizationId: string; itemId: string }) {
	const previous = await trx.query.purchaseItems.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, itemId), eq(fields.organizacaoId, organizationId)),
	});
	if (!previous) throw new createHttpError.NotFound("Item da compra não encontrado para processamento de estoque.");
	return previous;
}

type ApplyStockEntryParams = {
	trx: DBTransaction;
	organizationId: string;
	userId: string;
	purchaseId: string;
	purchaseItemId: string;
	item: { produtoId: string; produtoVarianteId?: string | null; quantidade: number };
	unitCost: number;
	reason: string;
};

async function applyStockEntry({ trx, organizationId, userId, purchaseId, purchaseItemId, item, unitCost, reason }: ApplyStockEntryParams) {
	if (item.produtoVarianteId) {
		await applyVariantStockMovement({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId,
			produtoId: item.produtoId,
			variantId: item.produtoVarianteId,
			signedQuantity: item.quantidade,
			unitCost,
			reason,
		});
		return;
	}
	await applyProductStockMovement({
		trx,
		organizationId,
		userId,
		purchaseId,
		purchaseItemId,
		produtoId: item.produtoId,
		signedQuantity: item.quantidade,
		unitCost,
		reason,
	});
}

type ApplyStockExitParams = {
	trx: DBTransaction;
	organizationId: string;
	userId: string;
	purchaseId: string;
	purchaseItemId: string;
	produtoId: string;
	produtoVarianteId?: string | null;
	quantidade: number;
	unitCost: number;
	reason: string;
};

async function applyStockExit({
	trx,
	organizationId,
	userId,
	purchaseId,
	purchaseItemId,
	produtoId,
	produtoVarianteId,
	quantidade,
	unitCost,
	reason,
}: ApplyStockExitParams) {
	if (produtoVarianteId) {
		await applyVariantStockMovement({
			trx,
			organizationId,
			userId,
			purchaseId,
			purchaseItemId,
			produtoId,
			variantId: produtoVarianteId,
			signedQuantity: -quantidade,
			unitCost,
			reason,
		});
		return;
	}
	await applyProductStockMovement({
		trx,
		organizationId,
		userId,
		purchaseId,
		purchaseItemId,
		produtoId,
		signedQuantity: -quantidade,
		unitCost,
		reason,
	});
}

type ApplyProductStockMovementParams = {
	trx: DBTransaction;
	organizationId: string;
	userId: string;
	purchaseId: string;
	purchaseItemId: string;
	produtoId: string;
	signedQuantity: number;
	unitCost: number;
	reason: string;
};

async function applyProductStockMovement({
	trx,
	organizationId,
	userId,
	purchaseId,
	purchaseItemId,
	produtoId,
	signedQuantity,
	unitCost,
	reason,
}: ApplyProductStockMovementParams) {
	const product = await trx.query.products.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, produtoId), eq(fields.organizacaoId, organizationId)),
		columns: { id: true, quantidade: true, precoCusto: true, rastreamentoEstoqueAtivo: true },
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado para movimentação de estoque.");
	if (!product.rastreamentoEstoqueAtivo) return;

	const previousQuantity = product.quantidade ?? 0;
	const previousUnitCost = product.precoCusto ?? null;
	const nextQuantity = previousQuantity + signedQuantity;
	const nextUnitCost = computeNextUnitCost({ previousQuantity, previousUnitCost, signedQuantity, unitCost });

	const movementType = signedQuantity >= 0 ? "ENTRADA_AQUISICAO" : "SAIDA";
	const recordedQuantity = Math.abs(signedQuantity);

	await trx.insert(productStockTransactions).values({
		organizacaoId: organizationId,
		produtoId,
		produtoVarianteId: null,
		compraId: purchaseId,
		compraItemId: purchaseItemId,
		tipo: movementType,
		quantidade: recordedQuantity,
		saldoAnterior: previousQuantity,
		saldoPosterior: nextQuantity,
		custoUnitarioMovimentado: unitCost,
		custoUnitarioAnterior: previousUnitCost,
		custoUnitarioPosterior: nextUnitCost,
		motivo: reason,
		operadorId: userId,
	});

	await trx
		.update(products)
		.set({
			quantidade: sql`COALESCE(${products.quantidade}, 0) + ${signedQuantity}`,
			...(nextUnitCost != null ? { precoCusto: nextUnitCost } : {}),
		})
		.where(and(eq(products.id, produtoId), eq(products.organizacaoId, organizationId)));
}

type ApplyVariantStockMovementParams = {
	trx: DBTransaction;
	organizationId: string;
	userId: string;
	purchaseId: string;
	purchaseItemId: string;
	produtoId: string;
	variantId: string;
	signedQuantity: number;
	unitCost: number;
	reason: string;
};

async function applyVariantStockMovement({
	trx,
	organizationId,
	userId,
	purchaseId,
	purchaseItemId,
	produtoId,
	variantId,
	signedQuantity,
	unitCost,
	reason,
}: ApplyVariantStockMovementParams) {
	const variant = await trx.query.productVariants.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, variantId), eq(fields.organizacaoId, organizationId)),
		columns: { id: true, produtoId: true, quantidade: true, precoCusto: true, rastreamentoEstoqueAtivo: true },
	});
	if (!variant) throw new createHttpError.NotFound("Variante de produto não encontrada para movimentação de estoque.");
	if (!variant.rastreamentoEstoqueAtivo) return;

	const previousQuantity = variant.quantidade ?? 0;
	const previousUnitCost = variant.precoCusto ?? null;
	const nextQuantity = previousQuantity + signedQuantity;
	const nextUnitCost = computeNextUnitCost({ previousQuantity, previousUnitCost, signedQuantity, unitCost });

	const movementType = signedQuantity >= 0 ? "ENTRADA_AQUISICAO" : "SAIDA";
	const recordedQuantity = Math.abs(signedQuantity);

	await trx.insert(productStockTransactions).values({
		organizacaoId: organizationId,
		produtoId: variant.produtoId,
		produtoVarianteId: variantId,
		compraId: purchaseId,
		compraItemId: purchaseItemId,
		tipo: movementType,
		quantidade: recordedQuantity,
		saldoAnterior: previousQuantity,
		saldoPosterior: nextQuantity,
		custoUnitarioMovimentado: unitCost,
		custoUnitarioAnterior: previousUnitCost,
		custoUnitarioPosterior: nextUnitCost,
		motivo: reason,
		operadorId: userId,
	});

	await trx
		.update(productVariants)
		.set({
			quantidade: sql`COALESCE(${productVariants.quantidade}, 0) + ${signedQuantity}`,
			...(nextUnitCost != null ? { precoCusto: nextUnitCost } : {}),
		})
		.where(and(eq(productVariants.id, variantId), eq(productVariants.organizacaoId, organizationId)));
}

type ComputeNextUnitCostParams = {
	previousQuantity: number;
	previousUnitCost: number | null;
	signedQuantity: number;
	unitCost: number;
};

function computeNextUnitCost({ previousQuantity, previousUnitCost, signedQuantity, unitCost }: ComputeNextUnitCostParams): number | null {
	const nextQuantity = previousQuantity + signedQuantity;

	if (signedQuantity >= 0) {
		if (previousQuantity <= 0 || previousUnitCost == null) return unitCost;
		if (nextQuantity <= 0) return previousUnitCost;
		return (previousQuantity * previousUnitCost + signedQuantity * unitCost) / nextQuantity;
	}

	if (previousUnitCost == null) return null;
	if (nextQuantity <= 0) return previousUnitCost;
	const numerator = previousQuantity * previousUnitCost - Math.abs(signedQuantity) * unitCost;
	const candidate = numerator / nextQuantity;
	if (!Number.isFinite(candidate) || candidate < 0) return previousUnitCost;
	return candidate;
}
