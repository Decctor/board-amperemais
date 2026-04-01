import dayjs from "dayjs";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import type { IPaymentProvider, TPaymentIntentResult, TProcessPaymentsInput, TRefundResult } from "../types";

function resolveDate(value?: string | Date | null, fallback = new Date()) {
	if (!value) return fallback;
	const parsed = value instanceof Date ? value : dayjs(value).toDate();
	return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function buildTransactionTitle(method: string, observacoes?: string | null) {
	return observacoes?.trim() ? `Pagamento via ${method} - ${observacoes.trim()}` : `Pagamento via ${method} - Venda`;
}

export class LocalPaymentProvider implements IPaymentProvider {
	async processPayments(input: TProcessPaymentsInput): Promise<TPaymentIntentResult[]> {
		const results: TPaymentIntentResult[] = [];

		for (const pagamento of input.pagamentos) {
			const now = new Date();
			const isInstallmentPayment = pagamento.metodo === "CARTAO_CREDITO" && (pagamento.totalParcelas ?? 1) > 1;

			if (isInstallmentPayment) {
				const totalParcelas = pagamento.totalParcelas ?? 1;
				const primeiraData = resolveDate(pagamento.dataPrevisao, now);
				const valorParcelaBase = Number((pagamento.valor / totalParcelas).toFixed(2));
				let valorAcumulado = 0;

				for (let parcela = 1; parcela <= totalParcelas; parcela++) {
					const valorParcela = parcela === totalParcelas ? Number((pagamento.valor - valorAcumulado).toFixed(2)) : valorParcelaBase;
					valorAcumulado += valorParcela;
					const dataPrevisao = dayjs(primeiraData).add(parcela - 1, "month").toDate();

					const [inserted] = await db
						.insert(financialTransactions)
						.values({
							organizacaoId: input.organizacaoId,
							lancamentoContabilId: input.lancamentoContabilId,
							contaFinanceiraId: pagamento.contaFinanceiraPadraoId ?? null,
							titulo: buildTransactionTitle(pagamento.metodo, pagamento.observacoes),
							tipo: "ENTRADA",
							valor: valorParcela,
							metodo: pagamento.metodo,
							dataPrevisao,
							dataEfetivacao: null,
							parcela,
							totalParcelas,
							provedorReferencia: null,
							provedorStatus: "PENDENTE",
							autorId: input.autorId,
						})
						.returning({ id: financialTransactions.id });

					results.push({
						transacaoId: inserted.id,
						provedorReferencia: null,
						provedorStatus: "PENDENTE",
						efetivado: false,
					});
				}

				continue;
			}

			const isImmediate = pagamento.efetivacaoTipo === "IMEDIATA";
			const dataPrevisao = isImmediate ? now : resolveDate(pagamento.dataPrevisao, now);
			const dataEfetivacao = isImmediate ? now : null;
			const provedorStatus = isImmediate ? "APROVADO" : "PENDENTE";

			const [inserted] = await db
				.insert(financialTransactions)
				.values({
					organizacaoId: input.organizacaoId,
					lancamentoContabilId: input.lancamentoContabilId,
					contaFinanceiraId: pagamento.contaFinanceiraPadraoId ?? null,
					titulo: buildTransactionTitle(pagamento.metodo, pagamento.observacoes),
					tipo: "ENTRADA",
					valor: pagamento.valor,
					metodo: pagamento.metodo,
					dataPrevisao,
					dataEfetivacao,
					parcela: null,
					totalParcelas: pagamento.totalParcelas ?? null,
					provedorReferencia: null,
					provedorStatus,
					autorId: input.autorId,
				})
				.returning({ id: financialTransactions.id });

			results.push({
				transacaoId: inserted.id,
				provedorReferencia: null,
				provedorStatus,
				efetivado: isImmediate,
			});
		}

		return results;
	}

	async refundPayment(transacaoId: string, _valor?: number): Promise<TRefundResult> {
		await db.update(financialTransactions).set({ provedorStatus: "ESTORNADO" }).where(eq(financialTransactions.id, transacaoId));

		return {
			provedorReferencia: null,
			provedorStatus: "ESTORNADO",
		};
	}

	async getPaymentStatus(_provedorReferencia: string): Promise<string> {
		return "APROVADO";
	}
}
