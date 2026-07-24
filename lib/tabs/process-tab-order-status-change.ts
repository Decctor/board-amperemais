import { attendanceStatusRequiresPhysicalOut, isValidAttendanceTransition } from "@/lib/sales/sale-processing/attendance";
import { processStockDeduction } from "@/lib/sales/sale-processing/process-stock-deduction";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { tabOrders, tabs } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

export type TProcessTabOrderStatusChangeInput = {
	organization: TOrganizationEntity;
	tabOrderId: string;
	targetStatus: TSaleAttendanceStatusEnum;
	authorId: string;
};

/**
 * Transicao operacional de um pedido (rodada) de conta — espelho de
 * processSaleAttendanceStatusChange no grao do pedido. Diferencas deliberadas:
 * - SEM gate de pagamento: pedido de comanda e entregue sem estar pago (o pagamento e no fechamento);
 * - SEM efeitos pos-entrega: fiscal e cashback disparam uma unica vez, no fechamento da conta;
 * - baixa fisica POR PEDIDO: entrega baixa apenas os itens da rodada, via delta por item.
 */
export async function processTabOrderStatusChange(input: TProcessTabOrderStatusChangeInput) {
	const order = await db.query.tabOrders.findFirst({
		where: and(eq(tabOrders.id, input.tabOrderId), eq(tabOrders.organizacaoId, input.organization.id)),
		with: {
			tab: { columns: { id: true, status: true } },
		},
	});

	if (!order) throw new createHttpError.NotFound("Pedido nao encontrado.");
	if (order.tab.status !== "ABERTA") throw new createHttpError.BadRequest("A conta deste pedido nao esta aberta.");

	if (!isValidAttendanceTransition(order.status, input.targetStatus)) {
		throw new createHttpError.BadRequest(`Transicao de pedido invalida: ${order.status} -> ${input.targetStatus}.`);
	}

	const requiresPhysicalOut = attendanceStatusRequiresPhysicalOut(input.targetStatus);

	await db.transaction(async (tx) => {
		// Lock da tab: serializa contra fechamento/cancelamento concorrentes da conta.
		const [tab] = await tx.select({ id: tabs.id, status: tabs.status }).from(tabs).where(eq(tabs.id, order.tabId)).for("update");
		if (!tab || tab.status !== "ABERTA") throw new createHttpError.BadRequest("A conta deste pedido nao esta aberta.");

		// Guarda de estado: outro operador pode ter transicionado o pedido enquanto isso.
		const updatedRows = await tx
			.update(tabOrders)
			.set({ status: input.targetStatus })
			.where(and(eq(tabOrders.id, order.id), eq(tabOrders.status, order.status)))
			.returning({ id: tabOrders.id });
		if (updatedRows.length === 0) {
			throw new createHttpError.Conflict("O pedido foi alterado por outra operacao. Atualize e tente novamente.");
		}

		if (requiresPhysicalOut && input.organization.configuracao.preferencias.rastreamentoEstoque) {
			const orderItems = await tx.query.saleItems.findMany({
				where: (fields, { eq }) => eq(fields.tabOrderId, order.id),
				with: { adicionais: true },
			});
			if (orderItems.length > 0) {
				// Delta por item: baixa apenas o que ainda nao foi entregue e atualiza quantidadeEntregue.
				await processStockDeduction(tx, {
					organizationId: input.organization.id,
					saleId: orderItems[0].vendaId,
					saleItems: orderItems,
					saleAuthorId: input.authorId,
					reason: `Pedido ${order.numero} entregue`,
				});
			}
		}
	});

	return {
		tabOrderId: order.id,
		tabId: order.tabId,
		statusAnterior: order.status,
		status: input.targetStatus,
	};
}
export type TProcessTabOrderStatusChangeResult = Awaited<ReturnType<typeof processTabOrderStatusChange>>;
