import dayjs from "dayjs";
import { and, eq, gte, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { FINANCIAL_TRANSFER_METHOD } from "@/lib/finances";
import { getOrganizationAccountBalances } from "@/lib/finances/analytics/balances";
import { BURN_WINDOW_MONTHS, buildDailyCashProjection, computeBurnAndRunway, type TProjectedCashFlow } from "@/lib/finances/analytics/cash";
import { getRecurringMonthlyCommitmentsForOrganization } from "@/lib/finances/analytics/commitments";
import { getTransactionForecastDate } from "@/lib/finances/generate-recurring-accounting-entries";
import { getRecurringOccurrencesUntil } from "@/lib/finances/recurrence";
import { formatAsNumber } from "@/lib/formatting";
import { canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialAccounts, financialRecurringRules, financialTransactions } from "@/services/drizzle/schema";

const GetFinancesCashFlowInputSchema = z.object({
	horizonDays: z
		.string({ invalid_type_error: "Tipo inválido para o horizonte de projeção." })
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : 90))
		.pipe(
			z
				.number({ invalid_type_error: "Tipo inválido para o horizonte de projeção." })
				.int({ message: "O horizonte de projeção deve ser um número inteiro de dias." })
				.min(7, { message: "O horizonte mínimo de projeção é de 7 dias." })
				.max(180, { message: "O horizonte máximo de projeção é de 180 dias." }),
		),
});
export type TGetFinancesCashFlowInput = z.infer<typeof GetFinancesCashFlowInputSchema>;

async function getFinancesCashFlow({ input, session }: { input: TGetFinancesCashFlowInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { horizonDays } = input;
	const today = dayjs().startOf("day");
	const horizonEnd = today.add(horizonDays, "day").endOf("day");

	const burnWindowStart = today.subtract(BURN_WINDOW_MONTHS, "month").startOf("month").toDate();
	const currentMonthStart = today.startOf("month").toDate();

	const [balances, monthlyFlowRows, recurringCommitments, pendingTransactions, activeRules] = await Promise.all([
		getOrganizationAccountBalances({ organizationId }),
		db
			.select({
				mes: sql<string>`to_char(date_trunc('month', ${financialTransactions.dataEfetivacao}), 'YYYY-MM')`,
				entradas: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.tipo} = 'ENTRADA' THEN ${financialTransactions.valor} ELSE 0 END), 0)`,
				saidas: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.tipo} = 'SAIDA' THEN ${financialTransactions.valor} ELSE 0 END), 0)`,
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, organizationId),
					// Transferências zeram no líquido, mas inflariam entradas/saídas mensais
					ne(financialTransactions.metodo, FINANCIAL_TRANSFER_METHOD),
					gte(financialTransactions.dataEfetivacao, burnWindowStart),
					lt(financialTransactions.dataEfetivacao, currentMonthStart),
				),
			)
			.groupBy(sql`date_trunc('month', ${financialTransactions.dataEfetivacao})`)
			.orderBy(sql`date_trunc('month', ${financialTransactions.dataEfetivacao})`),
		getRecurringMonthlyCommitmentsForOrganization(organizationId),
		db
			.select({
				tipo: financialTransactions.tipo,
				valor: financialTransactions.valor,
				dataPrevisao: financialTransactions.dataPrevisao,
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, organizationId),
					isNull(financialTransactions.dataEfetivacao),
					lte(financialTransactions.dataPrevisao, horizonEnd.toDate()),
				),
			),
		db.query.financialRecurringRules.findMany({
			where: and(eq(financialRecurringRules.organizacaoId, organizationId), eq(financialRecurringRules.status, "ATIVA")),
		}),
	]);

	const fluxosMensais = monthlyFlowRows.map((row) => ({
		mes: row.mes,
		entradas: formatAsNumber(row.entradas),
		saidas: formatAsNumber(row.saidas),
		liquido: formatAsNumber(row.entradas) - formatAsNumber(row.saidas),
	}));
	const burn = computeBurnAndRunway({ fluxosMensais, totalCaixa: balances.totalCaixa });

	// Fonte 2 da projeção: ocorrências de regras recorrentes ainda não materializadas.
	// proximaGeracaoEm é a primeira ocorrência NÃO gerada; expandir a partir dela não duplica as pendentes.
	const templateAccountIds = [
		...new Set(activeRules.flatMap((rule) => rule.templateTransacoes.map((template) => template.contaFinanceiraId)).filter((id): id is string => !!id)),
	];
	const templateAccounts =
		templateAccountIds.length > 0
			? await db.query.financialAccounts.findMany({
					where: and(eq(financialAccounts.organizacaoId, organizationId), inArray(financialAccounts.id, templateAccountIds)),
					columns: { id: true, tipo: true, configuracao: true },
				})
			: [];
	const templateAccountsMap = new Map(templateAccounts.map((account) => [account.id, account]));

	const projectedRecurringFlows: TProjectedCashFlow[] = [];
	for (const rule of activeRules) {
		const firstNonGenerated = rule.proximaGeracaoEm ?? rule.config.inicio;
		if (!firstNonGenerated || dayjs(firstNonGenerated).isAfter(horizonEnd)) continue;

		const occurrenceDates = getRecurringOccurrencesUntil(rule.config, firstNonGenerated, horizonEnd.toDate());
		for (const occurrenceDate of occurrenceDates) {
			for (const template of rule.templateTransacoes) {
				const account = template.contaFinanceiraId ? templateAccountsMap.get(template.contaFinanceiraId) : undefined;
				const dataPrevisao = getTransactionForecastDate({ occurrenceDate, template, account });
				if (dayjs(dataPrevisao).isAfter(horizonEnd)) continue;
				projectedRecurringFlows.push({ tipo: template.tipo, valor: formatAsNumber(template.valor), dataPrevisao });
			}
		}
	}

	const pendingFlows: TProjectedCashFlow[] = pendingTransactions
		.filter((transaction) => !!transaction.dataPrevisao)
		.map((transaction) => ({ tipo: transaction.tipo, valor: formatAsNumber(transaction.valor), dataPrevisao: transaction.dataPrevisao as Date }));

	const projection = buildDailyCashProjection({
		horizonDays,
		saldoInicial: balances.totalCaixa,
		flows: [...pendingFlows, ...projectedRecurringFlows],
	});

	return {
		data: {
			visaoGeral: {
				totalCaixa: balances.totalCaixa,
				totalPassivos: balances.totalPassivos,
				posicaoLiquida: balances.posicaoLiquida,
				contas: balances.contas,
				fluxosMensais,
				mediaLiquidaMensal: burn.mediaLiquidaMensal,
				queimaMensal: burn.queimaMensal,
				mesesDeCaixa: burn.mesesDeCaixa,
				recorrentesEntradaMensal: recurringCommitments.entradas,
				recorrentesSaidaMensal: recurringCommitments.saidas,
			},
			projecao: {
				horizonteDias: horizonDays,
				...projection,
			},
		},
		message: "Fluxo de caixa calculado com sucesso.",
	};
}
export type TGetFinancesCashFlowOutput = Awaited<ReturnType<typeof getFinancesCashFlow>>;

async function getFinancesCashFlowRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancesCashFlowInputSchema.parse({
		horizonDays: searchParams.get("horizonDays") ?? null,
	});
	const result = await getFinancesCashFlow({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancesCashFlowRoute });
