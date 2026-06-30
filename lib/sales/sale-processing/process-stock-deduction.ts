import { applyStockMovement } from "@/lib/stock/apply-stock-movement";
import { consumeStockLotsByFefo } from "@/lib/stock/consume-stock-lots-fefo";
import { DBTransaction } from "@/services/drizzle";
import type { TSaleItemEntity } from "@/services/drizzle/schema/sales";
import createHttpError from "http-errors";

type SaleItemForStock = TSaleItemEntity & {
	adicionais?: {
		id: string;
		opcaoId: string | null;
		quantidade: number;
	}[];
};

type ProcessStockDeductionParams = {
	organizationId: string;
	saleId: string;
	saleItems: SaleItemForStock[];
	saleAuthorId: string | null;
};

export async function processStockDeduction(tx: DBTransaction, params: ProcessStockDeductionParams) {
	const optionIds = [
		...new Set(
			params.saleItems
				.flatMap((item) => item.adicionais ?? [])
				.map((modifier) => modifier.opcaoId)
				.filter((id): id is string => !!id),
		),
	];

	const addOnOptions =
		optionIds.length > 0
			? await tx.query.productAddOnOptions.findMany({
					where: (fields, { and, eq, inArray }) =>
						and(inArray(fields.id, optionIds), eq(fields.organizacaoId, params.organizationId), eq(fields.ativo, true)),
					columns: {
						id: true,
						nome: true,
						produtoId: true,
						produtoVarianteId: true,
						quantidadeConsumo: true,
					},
					with: {
						produtoVariante: {
							columns: {
								id: true,
								produtoId: true,
							},
						},
					},
				})
			: [];

	const optionMap = new Map(addOnOptions.map((option) => [option.id, option]));

	async function deductStock({
		productId,
		variantId,
		quantity,
		saleItemId,
		reason,
	}: {
		productId: string;
		variantId?: string | null;
		quantity: number;
		saleItemId: string;
		reason: string;
	}) {
		if (quantity <= 0) return;

		const consumedLots = await consumeStockLotsByFefo({
			trx: tx,
			organizationId: params.organizationId,
			userId: params.saleAuthorId,
			produtoId: productId,
			produtoVarianteId: variantId,
			quantidade: quantity,
			movementType: "SAIDA",
			reason,
			links: {
				vendaId: params.saleId,
				vendaItemId: saleItemId,
			},
			allowPartial: true,
		});
		const consumedFromLots = consumedLots.reduce((total, lot) => total + lot.quantidadeConsumida, 0);
		const remainingQuantity = quantity - consumedFromLots;

		if (remainingQuantity <= 0) {
			return;
		}

		await applyStockMovement({
			trx: tx,
			organizationId: params.organizationId,
			userId: params.saleAuthorId,
			produtoId: productId,
			produtoVarianteId: variantId,
			signedQuantity: -remainingQuantity,
			movementType: "SAIDA",
			reason,
			links: {
				vendaId: params.saleId,
				vendaItemId: saleItemId,
			},
			validateSufficientStock: true,
		});
	}

	for (const item of params.saleItems) {
		if (item.produtoVarianteId) {
			await deductStock({
				productId: item.produtoId,
				variantId: item.produtoVarianteId,
				quantity: item.quantidade,
				saleItemId: item.id,
				reason: "Venda confirmada",
			});
		} else {
			await deductStock({
				productId: item.produtoId,
				quantity: item.quantidade,
				saleItemId: item.id,
				reason: "Venda confirmada",
			});
		}

		for (const modifier of item.adicionais ?? []) {
			if (!modifier.opcaoId) continue;
			const option = optionMap.get(modifier.opcaoId);
			if (!option) continue;

			const quantity = item.quantidade * modifier.quantidade * option.quantidadeConsumo;
			if (quantity <= 0) continue;

			if (option.produtoVarianteId) {
				const optionProductId = option.produtoVariante?.produtoId ?? option.produtoId;
				if (!optionProductId) throw new createHttpError.NotFound("Produto vinculado ao adicional nao encontrado.");

				await deductStock({
					productId: optionProductId,
					variantId: option.produtoVarianteId,
					quantity,
					saleItemId: item.id,
					reason: `Adicional vendido: ${option.nome}`,
				});
				continue;
			}

			if (option.produtoId) {
				await deductStock({
					productId: option.produtoId,
					quantity,
					saleItemId: item.id,
					reason: `Adicional vendido: ${option.nome}`,
				});
			}
		}
	}

	return { success: true };
}
