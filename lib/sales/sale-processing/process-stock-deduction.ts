import { applyStockMovement } from "@/lib/stock/apply-stock-movement";
import { consumeStockLotsByFefo } from "@/lib/stock/consume-stock-lots-fefo";
import { DBTransaction } from "@/services/drizzle";
import { saleItems } from "@/services/drizzle/schema";
import type { TSaleItemEntity } from "@/services/drizzle/schema/sales";
import { eq } from "drizzle-orm";
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
	reason?: string;
};

/**
 * Baixa fisica de estoque da venda. Ponto UNICO de baixa e de deduplicacao — chamado pela
 * confirmacao, pela transicao de atendimento, pela ingestao de canais gerenciados e pelo
 * fechamento de conta. A dedup e no grao do ITEM, combinando duas defesas:
 *
 * 1. item que ja possui SAIDA registrada e pulado. Cobre o dado legado, em que a baixa
 *    acontecia sem preencher `quantidadeEntregue` (venda nascida ENTREGUE nunca passava pela
 *    transicao de atendimento) — sem isso, um replay de webhook baixaria de novo;
 * 2. itens sem SAIDA baixam o DELTA `quantidade - quantidadeCancelada - quantidadeEntregue`,
 *    e `quantidadeEntregue` e atualizada na mesma transacao.
 *
 * O grao de item (e nao de venda) e o que permite a conta de atendimento baixar por pedido
 * entregue e, no fechamento, baixar somente os itens que nunca sairam — uma guarda por venda
 * pularia a venda inteira por ja existir SAIDA de um pedido anterior.
 *
 * Retorna a quantidade de itens que geraram baixa nesta chamada.
 */
export async function processStockDeduction(tx: DBTransaction, params: ProcessStockDeductionParams) {
	const reason = params.reason ?? "Venda confirmada";

	// Itens desta venda que ja possuem saida registrada (uma query para todos).
	const existingOutbound = await tx.query.productStockTransactions.findMany({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, params.organizationId), eq(fields.vendaId, params.saleId), eq(fields.tipo, "SAIDA")),
		columns: { vendaItemId: true },
	});
	const alreadyDeductedItemIds = new Set(existingOutbound.map((transaction) => transaction.vendaItemId).filter((id): id is string => !!id));
	let deductedItemsCount = 0;

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

	// Modo de baixa por produto: ESTOQUE_PROPRIO baixa o saldo do proprio produto;
	// COMPOSICAO explode a ficha tecnica e baixa os INSUMOS (o prato nunca tem saldo).
	const itemProductIds = [...new Set(params.saleItems.map((item) => item.produtoId))];
	const itemProducts =
		itemProductIds.length > 0
			? await tx.query.products.findMany({
					where: (fields, { and, eq, inArray }) => and(inArray(fields.id, itemProductIds), eq(fields.organizacaoId, params.organizationId)),
					columns: { id: true, baixaEstoqueModo: true, fichaTecnicaReceitaId: true },
				})
			: [];
	const productDeductionModeMap = new Map(itemProducts.map((product) => [product.id, product]));

	const recipeIds = [
		...new Set(
			itemProducts
				.filter((product) => product.baixaEstoqueModo === "COMPOSICAO" && product.fichaTecnicaReceitaId)
				.map((product) => product.fichaTecnicaReceitaId as string),
		),
	];
	const recipes =
		recipeIds.length > 0
			? await tx.query.productionRecipes.findMany({
					where: (fields, { and, eq, inArray }) => and(inArray(fields.id, recipeIds), eq(fields.organizacaoId, params.organizationId), eq(fields.ativo, true)),
					columns: { id: true },
					with: {
						insumos: {
							columns: { produtoId: true, produtoVarianteId: true, quantidade: true },
						},
					},
				})
			: [];
	const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

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
		// Defesa 1 (dado legado): item com saida registrada mas `quantidadeEntregue` zerada e uma
		// baixa antiga que nao preenchia o campo — nao baixa de novo. Quando `quantidadeEntregue`
		// esta preenchido, a saida existente e pos-legado e o delta da Defesa 2 e confiavel (permite
		// a edicao de venda re-baixar exatamente o crescimento da quantidade).
		if (alreadyDeductedItemIds.has(item.id) && (item.quantidadeEntregue ?? 0) <= 0) continue;

		// Defesa 2 (delta por item): o que ainda falta entregar. Itens cancelados nao baixam;
		// itens ja entregues (por pedido de comanda ou baixa anterior) tem delta zero.
		const deliverableQuantity = Math.max(0, item.quantidade - (item.quantidadeCancelada ?? 0));
		const deltaQuantity = Math.max(0, deliverableQuantity - (item.quantidadeEntregue ?? 0));
		if (deltaQuantity <= 0) continue;

		const productMode = productDeductionModeMap.get(item.produtoId);
		const recipe = productMode?.baixaEstoqueModo === "COMPOSICAO" && productMode.fichaTecnicaReceitaId ? recipeMap.get(productMode.fichaTecnicaReceitaId) : null;

		if (productMode?.baixaEstoqueModo === "COMPOSICAO") {
			// Explosao da ficha tecnica: baixa cada insumo em delta * quantidade do insumo,
			// com FEFO (consome inclusive lotes do pre-preparo). O produto composto em si
			// nao gera movimentacao. Sem receita ativa: nao baixa nada e nao bloqueia a
			// venda (progressive disclosure — consistente com o restante do ERP).
			if (recipe) {
				for (const insumo of recipe.insumos) {
					await deductStock({
						productId: insumo.produtoId,
						variantId: insumo.produtoVarianteId,
						quantity: deltaQuantity * insumo.quantidade,
						saleItemId: item.id,
						reason: `${reason} (composicao)`,
					});
				}
			} else {
				console.warn(`processStockDeduction: produto ${item.produtoId} em modo COMPOSICAO sem ficha tecnica ativa — baixa ignorada.`);
			}
		} else if (item.produtoVarianteId) {
			await deductStock({
				productId: item.produtoId,
				variantId: item.produtoVarianteId,
				quantity: deltaQuantity,
				saleItemId: item.id,
				reason,
			});
		} else {
			await deductStock({
				productId: item.produtoId,
				quantity: deltaQuantity,
				saleItemId: item.id,
				reason,
			});
		}

		for (const modifier of item.adicionais ?? []) {
			if (!modifier.opcaoId) continue;
			const option = optionMap.get(modifier.opcaoId);
			if (!option) continue;

			const quantity = deltaQuantity * modifier.quantidade * option.quantidadeConsumo;
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

		// A quantidade entregue e a fonte da deduplicacao: atualizada junto com a baixa, na mesma transacao.
		await tx
			.update(saleItems)
			.set({ quantidadeEntregue: (item.quantidadeEntregue ?? 0) + deltaQuantity })
			.where(eq(saleItems.id, item.id));
		deductedItemsCount += 1;
	}

	return { success: true, deductedItemsCount };
}
