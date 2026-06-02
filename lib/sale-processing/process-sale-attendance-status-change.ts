import { db } from "@/services/drizzle";
import { productStockTransactions, saleItems, sales } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { attendanceStatusRequiresPhysicalOut, isValidAttendanceTransition } from "./attendance";
import { processStockDeduction } from "./process-stock-deduction";

type ProcessSaleAttendanceStatusChangeInput = {
	organization: TOrganizationEntity;
	saleId: string;
	targetStatus: TSaleAttendanceStatusEnum;
	authorId: string;
};

/**
 * Aplica uma transicao de status de atendimento (fulfillment) a uma venda.
 *
 * Responsabilidades:
 * - validar a transicao de `statusAtendimento`;
 * - executar baixa fisica de estoque somente quando a transicao exigir saida fisica (entrega);
 * - evitar baixa duplicada verificando transacoes de estoque ja existentes para a venda;
 * - atualizar quantidades operacionais dos itens quando aplicavel.
 */
export async function processSaleAttendanceStatusChange(input: ProcessSaleAttendanceStatusChangeInput) {
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.saleId), eq(fields.organizacaoId, input.organization.id)),
		with: {
			itens: {
				with: {
					adicionais: true,
				},
			},
		},
	});

	if (!sale) throw new createHttpError.NotFound("Venda nao encontrada.");

	if (sale.statusVenda !== "CONFIRMADA") {
		throw new createHttpError.BadRequest("Somente vendas confirmadas podem ter o atendimento atualizado.");
	}

	const currentStatus = sale.statusAtendimento;
	if (!isValidAttendanceTransition(currentStatus, input.targetStatus)) {
		throw new createHttpError.BadRequest(`Transicao de atendimento invalida: ${currentStatus} -> ${input.targetStatus}.`);
	}

	const requiresPhysicalOut = attendanceStatusRequiresPhysicalOut(input.targetStatus);

	await db.transaction(async (tx) => {
		if (requiresPhysicalOut && input.organization.configuracao.preferencias.rastreamentoEstoque) {
			// Evita baixa duplicada: so baixa se ainda nao houver saida de estoque para esta venda.
			const existingDeduction = await tx.query.productStockTransactions.findFirst({
				where: and(
					eq(productStockTransactions.organizacaoId, input.organization.id),
					eq(productStockTransactions.vendaId, input.saleId),
					eq(productStockTransactions.tipo, "SAIDA"),
				),
				columns: { id: true },
			});

			if (!existingDeduction) {
				await processStockDeduction(tx, {
					organizationId: input.organization.id,
					saleId: input.saleId,
					saleItems: sale.itens,
					saleAuthorId: input.authorId,
				});
			}
		}

		await tx.update(sales).set({ statusAtendimento: input.targetStatus }).where(eq(sales.id, input.saleId));

		// Ao entregar totalmente, registra a quantidade entregue de cada item.
		if (input.targetStatus === "ENTREGUE") {
			for (const item of sale.itens) {
				await tx.update(saleItems).set({ quantidadeEntregue: item.quantidade }).where(eq(saleItems.id, item.id));
			}
		}
	});

	return {
		saleId: input.saleId,
		statusAtendimentoAnterior: currentStatus,
		statusAtendimento: input.targetStatus,
	};
}
