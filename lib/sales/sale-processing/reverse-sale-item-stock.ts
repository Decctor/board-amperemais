import { applyStockMovement } from "@/lib/stock/apply-stock-movement";
import type { DBTransaction } from "@/services/drizzle";
import { productStockLots, productStockTransactions, saleItems } from "@/services/drizzle/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import createHttpError from "http-errors";

/**
 * Estorna a saída de estoque de UM item de venda via movimentos compensatórios (ENTRADA_DEVOLUCAO),
 * líquidos das devoluções já feitas, e decrementa `saleItems.quantidadeEntregue` na mesma transação —
 * mantendo o dedup de baixa (`processStockDeduction`) consistente para re-baixas futuras.
 *
 * `quantity` é em unidades DO ITEM (não do insumo): itens COMPOSICAO têm suas SAIDAs de insumos
 * revertidas proporcionalmente, sem reler receitas — os movimentos já carregam `vendaItemId`.
 * `quantity` ausente = reverter tudo que ainda está fora (cancelamento / remoção do item).
 */

const roundQuantity = (value: number) => Math.round(value * 1e6) / 1e6;

type MovementRow = {
	id: string;
	produtoId: string;
	produtoVarianteId: string | null;
	loteId: string | null;
	tipo: string;
	quantidade: number;
	custoUnitarioMovimentado: number | null;
};

export async function reverseSaleItemStock({
	tx,
	organizationId,
	saleId,
	saleItemId,
	authorId,
	reason,
	quantity,
}: {
	tx: DBTransaction;
	organizationId: string;
	saleId: string;
	saleItemId: string;
	authorId: string | null;
	reason: string;
	quantity?: number;
}): Promise<{ reversedQuantity: number }> {
	const item = await tx.query.saleItems.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, saleItemId), eq(fields.organizacaoId, organizationId), eq(fields.vendaId, saleId)),
		columns: { id: true, quantidadeEntregue: true },
	});
	if (!item) throw new createHttpError.NotFound("Item da venda não encontrado para estorno de estoque.");

	const deliveredQuantity = item.quantidadeEntregue ?? 0;
	const unitsToReverse = quantity == null ? deliveredQuantity : Math.min(quantity, deliveredQuantity);
	if (unitsToReverse < 0) throw new createHttpError.BadRequest("Quantidade de estorno de estoque inválida.");

	// Proporção do que está fora que deve voltar. Sem entregas registradas não há denominador — e
	// tampouco baixa a estornar (a baixa incrementa `quantidadeEntregue` na mesma transação).
	const scale = quantity == null ? 1 : deliveredQuantity > 0 ? unitsToReverse / deliveredQuantity : 0;

	const movements = (await tx
		.select({
			id: productStockTransactions.id,
			produtoId: productStockTransactions.produtoId,
			produtoVarianteId: productStockTransactions.produtoVarianteId,
			loteId: productStockTransactions.loteId,
			tipo: productStockTransactions.tipo,
			quantidade: productStockTransactions.quantidade,
			custoUnitarioMovimentado: productStockTransactions.custoUnitarioMovimentado,
		})
		.from(productStockTransactions)
		.where(
			and(
				eq(productStockTransactions.organizacaoId, organizationId),
				eq(productStockTransactions.vendaItemId, saleItemId),
				inArray(productStockTransactions.tipo, ["SAIDA", "ENTRADA_DEVOLUCAO"]),
			),
		)
		.orderBy(asc(productStockTransactions.dataInsercao), asc(productStockTransactions.id))) as MovementRow[];

	// Agrupa por destino físico (produto/variante/lote): o líquido de cada grupo é o que ainda está fora.
	const groups = new Map<string, { saidas: MovementRow[]; devolvido: number }>();
	for (const movement of movements) {
		const key = `${movement.produtoId}|${movement.produtoVarianteId ?? ""}|${movement.loteId ?? ""}`;
		const group = groups.get(key) ?? { saidas: [], devolvido: 0 };
		if (movement.tipo === "SAIDA") group.saidas.push(movement);
		else group.devolvido += movement.quantidade;
		groups.set(key, group);
	}

	if (scale > 0) {
		for (const group of groups.values()) {
			const totalSaida = group.saidas.reduce((acc, movement) => acc + movement.quantidade, 0);
			const outstanding = roundQuantity(totalSaida - group.devolvido);
			let remainingTarget = roundQuantity(outstanding * scale);
			if (remainingTarget <= 0) continue;

			// Devoluções anteriores são atribuídas às SAIDAs mais recentes (LIFO), então percorremos
			// da mais nova para a mais antiga absorvendo o já devolvido antes de fatiar o estorno.
			let priorReversed = group.devolvido;
			for (const movement of [...group.saidas].reverse()) {
				let available = movement.quantidade;
				const absorbed = Math.min(available, priorReversed);
				available = roundQuantity(available - absorbed);
				priorReversed = roundQuantity(priorReversed - absorbed);
				if (available <= 0) continue;

				const slice = roundQuantity(Math.min(available, remainingTarget));
				if (slice <= 0) break;

				await applyStockMovement({
					trx: tx,
					organizationId,
					userId: authorId,
					produtoId: movement.produtoId,
					produtoVarianteId: movement.produtoVarianteId,
					signedQuantity: slice,
					movementType: "ENTRADA_DEVOLUCAO",
					reason,
					unitCost: movement.custoUnitarioMovimentado,
					links: { loteId: movement.loteId, vendaId: saleId, vendaItemId: saleItemId },
				});

				if (movement.loteId) {
					const stockLot = await tx.query.productStockLots.findFirst({
						where: and(eq(productStockLots.id, movement.loteId), eq(productStockLots.organizacaoId, organizationId)),
						columns: { id: true, dataValidade: true, status: true },
					});
					if (stockLot) {
						const nextStatus =
							stockLot.status === "DESCARTADO" ? "DESCARTADO" : stockLot.dataValidade && stockLot.dataValidade < new Date() ? "VENCIDO" : "ATIVO";
						await tx
							.update(productStockLots)
							.set({ quantidadeAtual: sql`${productStockLots.quantidadeAtual} + ${slice}`, status: nextStatus })
							.where(and(eq(productStockLots.id, movement.loteId), eq(productStockLots.organizacaoId, organizationId)));
					}
				}

				remainingTarget = roundQuantity(remainingTarget - slice);
				if (remainingTarget <= 0) break;
			}
		}
	}

	if (unitsToReverse > 0) {
		await tx
			.update(saleItems)
			.set({ quantidadeEntregue: sql`GREATEST(0, ${saleItems.quantidadeEntregue} - ${unitsToReverse})` })
			.where(and(eq(saleItems.id, saleItemId), eq(saleItems.organizacaoId, organizationId)));
	}

	return { reversedQuantity: unitsToReverse };
}
