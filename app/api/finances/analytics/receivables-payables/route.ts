import dayjs from "dayjs";
import { and, eq, gt, gte, isNotNull, isNull, lte, ne, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { FINANCIAL_TRANSFER_METHOD } from "@/lib/finances";
import { bucketPendingByDueDate, DELAY_WINDOW_DAYS } from "@/lib/finances/analytics/aging";
import { getOrganizationAccountBalances } from "@/lib/finances/analytics/balances";
import { getRecurringMonthlyCommitmentsForOrganization } from "@/lib/finances/analytics/commitments";
import { formatAsNumber } from "@/lib/formatting";
import { canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";

const GetFinancesReceivablesPayablesInputSchema = z.object({
	periodAfter: z
		.string({ required_error: "Período não informado.", invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
	periodBefore: z
		.string({ required_error: "Período não informado.", invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
});
export type TGetFinancesReceivablesPayablesInput = z.infer<typeof GetFinancesReceivablesPayablesInputSchema>;

async function getFinancesReceivablesPayables({ input, session }: { input: TGetFinancesReceivablesPayablesInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const period = { after: input.periodAfter, before: input.periodBefore };
	const delayWindowStart = dayjs().startOf("day").subtract(DELAY_WINDOW_DAYS, "day").toDate();

	const [balances, pendingRows, delayRows, frictionRows, feesByMethodRows, recurringCommitments] = await Promise.all([
		getOrganizationAccountBalances({ organizationId }),
		db
			.select({
				tipo: financialTransactions.tipo,
				valor: financialTransactions.valor,
				dataPrevisao: financialTransactions.dataPrevisao,
			})
			.from(financialTransactions)
			.where(and(eq(financialTransactions.organizacaoId, organizationId), isNull(financialTransactions.dataEfetivacao))),
		db
			.select({
				tipo: financialTransactions.tipo,
				avgDelayDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${financialTransactions.dataEfetivacao} - ${financialTransactions.dataPrevisao})) / 86400)`,
				transactionsCount: sql<number>`COUNT(*)`,
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, organizationId),
					isNotNull(financialTransactions.dataEfetivacao),
					isNotNull(financialTransactions.dataPrevisao),
					// Transferências têm atraso zero por construção e diluiriam a média
					ne(financialTransactions.metodo, FINANCIAL_TRANSFER_METHOD),
					gte(financialTransactions.dataEfetivacao, delayWindowStart),
				),
			)
			.groupBy(financialTransactions.tipo),
		db
			.select({
				tipo: financialTransactions.tipo,
				juros: sum(financialTransactions.valorJuros),
				multas: sum(financialTransactions.valorMulta),
				descontos: sum(financialTransactions.valorDesconto),
				taxas: sum(financialTransactions.valorTaxas),
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, organizationId),
					isNotNull(financialTransactions.dataEfetivacao),
					gte(financialTransactions.dataEfetivacao, period.after),
					lte(financialTransactions.dataEfetivacao, period.before),
				),
			)
			.groupBy(financialTransactions.tipo),
		db
			.select({
				metodo: financialTransactions.metodo,
				taxas: sum(financialTransactions.valorTaxas),
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, organizationId),
					isNotNull(financialTransactions.dataEfetivacao),
					gte(financialTransactions.dataEfetivacao, period.after),
					lte(financialTransactions.dataEfetivacao, period.before),
					gt(financialTransactions.valorTaxas, 0),
				),
			)
			.groupBy(financialTransactions.metodo),
		getRecurringMonthlyCommitmentsForOrganization(organizationId),
	]);

	const aging = bucketPendingByDueDate(
		pendingRows.map((row) => ({ tipo: row.tipo, valor: formatAsNumber(row.valor), dataPrevisao: row.dataPrevisao })),
	);

	// Atraso médio (efetivação − previsão): proxy de DSO/DPO
	const receiptDelayRow = delayRows.find((row) => row.tipo === "ENTRADA");
	const paymentDelayRow = delayRows.find((row) => row.tipo === "SAIDA");

	// Custo de fricção financeira no período
	const inflowFriction = frictionRows.find((row) => row.tipo === "ENTRADA");
	const outflowFriction = frictionRows.find((row) => row.tipo === "SAIDA");
	const jurosMultasPagos = formatAsNumber(outflowFriction?.juros || 0) + formatAsNumber(outflowFriction?.multas || 0);
	const jurosMultasRecebidos = formatAsNumber(inflowFriction?.juros || 0) + formatAsNumber(inflowFriction?.multas || 0);
	const descontosObtidos = formatAsNumber(outflowFriction?.descontos || 0);
	const descontosConcedidos = formatAsNumber(inflowFriction?.descontos || 0);
	const taxasTotal = formatAsNumber(inflowFriction?.taxas || 0) + formatAsNumber(outflowFriction?.taxas || 0);
	const taxasPorMetodo = feesByMethodRows.map((row) => ({ metodo: row.metodo, total: formatAsNumber(row.taxas) })).sort((a, b) => b.total - a.total);

	// Liquidez
	const totalCaixa = balances.totalCaixa;
	const capitalGiro = totalCaixa + aging.totalAReceber - aging.totalAPagar;
	const coberturaMeses = recurringCommitments.saidas > 0 ? totalCaixa / recurringCommitments.saidas : null;

	return {
		data: {
			periodo: { inicio: period.after, fim: period.before },
			vencimentos: aging.vencimentos,
			totalAReceber: aging.totalAReceber,
			totalAPagar: aging.totalAPagar,
			vencidoAReceber: aging.vencidoAReceber,
			vencidoAPagar: aging.vencidoAPagar,
			janelaAtrasoDias: DELAY_WINDOW_DAYS,
			atrasoMedioRecebimentoDias: receiptDelayRow ? formatAsNumber(receiptDelayRow.avgDelayDays) : null,
			atrasoMedioPagamentoDias: paymentDelayRow ? formatAsNumber(paymentDelayRow.avgDelayDays) : null,
			recebimentosNaJanela: formatAsNumber(receiptDelayRow?.transactionsCount || 0),
			pagamentosNaJanela: formatAsNumber(paymentDelayRow?.transactionsCount || 0),
			friccao: {
				jurosMultasPagos,
				jurosMultasRecebidos,
				descontosObtidos,
				descontosConcedidos,
				taxasTotal,
				taxasPorMetodo,
			},
			liquidez: {
				totalCaixa,
				capitalGiro,
				coberturaMeses,
				despesasRecorrentesMensais: recurringCommitments.saidas,
			},
		},
		message: "Recebíveis e pagáveis calculados com sucesso.",
	};
}
export type TGetFinancesReceivablesPayablesOutput = Awaited<ReturnType<typeof getFinancesReceivablesPayables>>;

async function getFinancesReceivablesPayablesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancesReceivablesPayablesInputSchema.parse({
		periodAfter: searchParams.get("periodAfter") ?? null,
		periodBefore: searchParams.get("periodBefore") ?? null,
	});
	const result = await getFinancesReceivablesPayables({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancesReceivablesPayablesRoute });
