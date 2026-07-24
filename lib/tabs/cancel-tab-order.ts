import { applyStockMovement } from "@/lib/stock/apply-stock-movement";
import { db } from "@/services/drizzle";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { saleItems, tabOrders, tabs } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { recomputeTabDraftSaleTotals } from "./utils";

export type TCancelTabOrderInput = {
	tabOrderId: string;
	// Pedido ja entregue: o cancelamento e um estorno explicito. true = devolve o estoque
	// (ENTRADA_DEVOLUCAO); false = mantem a saida como registro fisico honesto (perda vira
	// ajuste manual). Obrigatorio quando houver itens entregues.
	devolverEstoque?: boolean | null;
	motivo?: string | null;
};

/**
 * Cancela um pedido (rodada) da conta:
 * - pedido nao entregue: status -> CANCELADO; itens marcam quantidadeCancelada = quantidade
 *   (marcar, nao deletar — preserva o historico do que foi pedido) e saem dos totais;
 * - pedido entregue: exige decisao explicita de estoque (devolverEstoque).
 */
export async function cancelTabOrder({
	organization,
	userId,
	input,
}: {
	organization: TOrganizationEntity;
	userId: string;
	input: TCancelTabOrderInput;
}) {
	const order = await db.query.tabOrders.findFirst({
		where: and(eq(tabOrders.id, input.tabOrderId), eq(tabOrders.organizacaoId, organization.id)),
		with: {
			itens: { with: { adicionais: true } },
		},
	});
	if (!order) throw new createHttpError.NotFound("Pedido nao encontrado.");
	if (order.status === "CANCELADO") throw new createHttpError.BadRequest("Pedido ja esta cancelado.");

	const deliveredItems = order.itens.filter((item) => (item.quantidadeEntregue ?? 0) > 0);
	if (deliveredItems.length > 0 && typeof input.devolverEstoque !== "boolean") {
		throw new createHttpError.BadRequest("O pedido possui itens entregues. Informe se o estoque deve ser devolvido.");
	}

	return db.transaction(async (tx) => {
		// Lock da tab: serializa contra fechamento da conta.
		const [tab] = await tx.select({ id: tabs.id, status: tabs.status }).from(tabs).where(eq(tabs.id, order.tabId)).for("update");
		if (!tab || tab.status !== "ABERTA") throw new createHttpError.BadRequest("A conta deste pedido nao esta aberta.");

		const cancelledRows = await tx
			.update(tabOrders)
			.set({ status: "CANCELADO", observacoes: input.motivo ? `${order.observacoes ?? ""}\n[CANCELAMENTO] ${input.motivo}`.trim() : order.observacoes })
			.where(and(eq(tabOrders.id, order.id), eq(tabOrders.status, order.status)))
			.returning({ id: tabOrders.id });
		if (cancelledRows.length === 0) {
			throw new createHttpError.Conflict("O pedido foi alterado por outra operacao. Atualize e tente novamente.");
		}

		// Devolucao fisica dos itens ja entregues, quando solicitada.
		if (input.devolverEstoque === true && deliveredItems.length > 0 && organization.configuracao.preferencias.rastreamentoEstoque) {
			const optionIds = [
				...new Set(
					deliveredItems
						.flatMap((item) => item.adicionais ?? [])
						.map((modifier) => modifier.opcaoId)
						.filter((id): id is string => !!id),
				),
			];
			const addOnOptions =
				optionIds.length > 0
					? await tx.query.productAddOnOptions.findMany({
							where: (fields, { and, eq, inArray }) => and(inArray(fields.id, optionIds), eq(fields.organizacaoId, organization.id)),
							columns: { id: true, nome: true, produtoId: true, produtoVarianteId: true, quantidadeConsumo: true },
							with: { produtoVariante: { columns: { id: true, produtoId: true } } },
						})
					: [];
			const optionMap = new Map(addOnOptions.map((option) => [option.id, option]));

			for (const item of deliveredItems) {
				const deliveredQuantity = item.quantidadeEntregue ?? 0;
				if (deliveredQuantity <= 0) continue;

				await applyStockMovement({
					trx: tx,
					organizationId: organization.id,
					userId,
					produtoId: item.produtoId,
					produtoVarianteId: item.produtoVarianteId,
					signedQuantity: deliveredQuantity,
					movementType: "ENTRADA_DEVOLUCAO",
					reason: `Pedido ${order.numero} cancelado (devolucao)`,
					links: { vendaId: item.vendaId, vendaItemId: item.id },
				});

				for (const modifier of item.adicionais ?? []) {
					if (!modifier.opcaoId) continue;
					const option = optionMap.get(modifier.opcaoId);
					if (!option) continue;
					const quantity = deliveredQuantity * modifier.quantidade * option.quantidadeConsumo;
					if (quantity <= 0) continue;
					const optionProductId = option.produtoVariante?.produtoId ?? option.produtoId;
					if (!optionProductId) continue;

					await applyStockMovement({
						trx: tx,
						organizationId: organization.id,
						userId,
						produtoId: optionProductId,
						produtoVarianteId: option.produtoVarianteId,
						signedQuantity: quantity,
						movementType: "ENTRADA_DEVOLUCAO",
						reason: `Adicional devolvido: ${option.nome}`,
						links: { vendaId: item.vendaId, vendaItemId: item.id },
					});
				}
			}
		}

		// Marca os itens como cancelados (deliverable = 0 -> delta zero, nunca mais baixam).
		for (const item of order.itens) {
			await tx.update(saleItems).set({ quantidadeCancelada: item.quantidade }).where(eq(saleItems.id, item.id));
		}

		const saleId = order.itens[0]?.vendaId;
		const totals = saleId ? await recomputeTabDraftSaleTotals(tx, { saleId }) : null;

		return {
			tabOrderId: order.id,
			tabId: order.tabId,
			valorTotalConta: totals?.valorTotal ?? null,
		};
	});
}
export type TCancelTabOrderResult = Awaited<ReturnType<typeof cancelTabOrder>>;
