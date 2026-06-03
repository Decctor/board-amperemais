import { db } from "@/services/drizzle";
import { financialTransactions, productStockTransactions, saleItems, sales } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import type { TPaymentMethodEnum, TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { attendanceStatusRequiresPhysicalOut, isValidAttendanceTransition } from "./attendance";
import { getSaleFinancialState } from "./get-sale-financial-state";
import { processSaleAutomaticFiscalEmissionIfEligible } from "./process-sale-automatic-fiscal-emission";
import { processSaleCashbackAccumulationIfEligible } from "./process-sale-cashback-accumulation";
import { processStockDeduction } from "./process-stock-deduction";

type ProcessSaleAttendanceStatusChangeInput = {
	organization: TOrganizationEntity;
	saleId: string;
	targetStatus: TSaleAttendanceStatusEnum;
	authorId: string;
	settlePendingPayment?: boolean;
	allowUnpaidDelivery?: boolean;
	paymentMethod?: TPaymentMethodEnum | null;
	financialAccountId?: string | null;
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
			lancamentosContabeis: {
				columns: { id: true },
				with: {
					transacoesFinanceiras: true,
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
	const financialState = requiresPhysicalOut ? await getSaleFinancialState({ organizationId: input.organization.id, saleId: input.saleId }) : null;
	if (requiresPhysicalOut && !financialState?.isFullyPaid && !input.settlePendingPayment && !input.allowUnpaidDelivery) {
		throw new createHttpError.BadRequest("Confirme o pagamento antes de entregar o pedido.");
	}

	await db.transaction(async (tx) => {
		if (requiresPhysicalOut && input.settlePendingPayment && !financialState?.isFullyPaid) {
			const pendingTransactions = sale.lancamentosContabeis
				.flatMap((entry) => entry.transacoesFinanceiras)
				.filter(
					(transaction) =>
						transaction.tipo === "ENTRADA" && !transaction.dataEfetivacao && !["CANCELADO", "ESTORNADO"].includes(transaction.provedorStatus ?? ""),
				);

			if (pendingTransactions.length === 0) throw new createHttpError.BadRequest("Não há pagamento pendente para efetivar.");
			const settledTotal = sale.lancamentosContabeis
				.flatMap((entry) => entry.transacoesFinanceiras)
				.filter(
					(transaction) =>
						transaction.tipo === "ENTRADA" && transaction.dataEfetivacao && !["CANCELADO", "ESTORNADO"].includes(transaction.provedorStatus ?? ""),
				)
				.reduce((sum, transaction) => sum + transaction.valor, 0);
			const pendingTotal = pendingTransactions.reduce((sum, transaction) => sum + transaction.valor, 0);
			if (settledTotal + pendingTotal < sale.valorTotal) throw new createHttpError.BadRequest("Os pagamentos registrados não cobrem o total da venda.");

			for (const transaction of pendingTransactions) {
				if (input.paymentMethod && transaction.metodo !== "A_DEFINIR" && transaction.metodo !== input.paymentMethod) {
					throw new createHttpError.BadRequest("O método de pagamento informado difere da intenção registrada.");
				}
				await tx
					.update(financialTransactions)
					.set({
						dataEfetivacao: new Date(),
						contaFinanceiraId: input.financialAccountId ?? transaction.contaFinanceiraId,
						metodo: input.paymentMethod ?? transaction.metodo,
						provedorStatus: "APROVADO",
					})
					.where(eq(financialTransactions.id, transaction.id));
			}
		}

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

	if (input.targetStatus === "ENTREGUE") {
		await processSaleCashbackAccumulationIfEligible({
			organizationId: input.organization.id,
			saleId: input.saleId,
			authorId: input.authorId,
		});
		await processSaleAutomaticFiscalEmissionIfEligible({
			organization: input.organization,
			saleId: input.saleId,
			authorId: input.authorId,
		});
	}

	return {
		saleId: input.saleId,
		statusAtendimentoAnterior: currentStatus,
		statusAtendimento: input.targetStatus,
	};
}
