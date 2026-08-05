import { and, eq, gte, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { accumulateCategoryTotals, buildCategoryTree, buildDreClassification, sumMapValues } from "@/lib/finances/analytics/classification";
import { getPreviousPeriod, getTrailingMonthKeys, getTrailingMonthsRange } from "@/lib/finances/analytics/periods";
import { formatAsNumber } from "@/lib/formatting";
import { canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { accountingEntries } from "@/services/drizzle/schema";

const GetFinancesDreInputSchema = z.object({
	periodAfter: z
		.string({ required_error: "Período não informado.", invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
	periodBefore: z
		.string({ required_error: "Período não informado.", invalid_type_error: "Tipo inválido para período." })
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
});
export type TGetFinancesDreInput = z.infer<typeof GetFinancesDreInputSchema>;

async function getFinancesDre({ input, session }: { input: TGetFinancesDreInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const period = { after: input.periodAfter, before: input.periodBefore };
	const previousPeriod = getPreviousPeriod(period);
	const seriesRange = getTrailingMonthsRange(period.before);
	const monthKeys = getTrailingMonthKeys(period.before);

	const chartAccounts = await db.query.accountsCharts.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
		columns: { id: true, nome: true, natureza: true, idContaPai: true },
	});
	const classification = buildDreClassification(chartAccounts);

	const groupedByAccountsForRange = (range: { after: Date; before: Date }) =>
		db
			.select({
				creditId: accountingEntries.idContaCredito,
				debitId: accountingEntries.idContaDebito,
				total: sum(accountingEntries.valor),
			})
			.from(accountingEntries)
			.where(
				and(
					eq(accountingEntries.organizacaoId, organizationId),
					gte(accountingEntries.dataCompetencia, range.after),
					lte(accountingEntries.dataCompetencia, range.before),
				),
			)
			.groupBy(accountingEntries.idContaCredito, accountingEntries.idContaDebito);

	const [monthlyRows, currentRows, previousRows] = await Promise.all([
		db
			.select({
				month: sql<string>`to_char(date_trunc('month', ${accountingEntries.dataCompetencia}), 'YYYY-MM')`,
				creditId: accountingEntries.idContaCredito,
				debitId: accountingEntries.idContaDebito,
				total: sum(accountingEntries.valor),
			})
			.from(accountingEntries)
			.where(
				and(
					eq(accountingEntries.organizacaoId, organizationId),
					gte(accountingEntries.dataCompetencia, seriesRange.after),
					lte(accountingEntries.dataCompetencia, seriesRange.before),
				),
			)
			.groupBy(sql`date_trunc('month', ${accountingEntries.dataCompetencia})`, accountingEntries.idContaCredito, accountingEntries.idContaDebito),
		groupedByAccountsForRange(period),
		groupedByAccountsForRange(previousPeriod),
	]);

	// Série mensal agregada (12 meses encerrando no mês final do período selecionado)
	const seriesBuckets = new Map<string, { receita: number; custo: number; despesa: number }>(
		monthKeys.map((month) => [month, { receita: 0, custo: 0, despesa: 0 }]),
	);
	for (const row of monthlyRows) {
		const bucket = seriesBuckets.get(row.month);
		if (!bucket) continue;
		const total = formatAsNumber(row.total);
		if (classification.revenueIds.has(row.creditId)) bucket.receita += total;
		if (classification.costIds.has(row.debitId)) bucket.custo += total;
		else if (classification.expenseIds.has(row.debitId)) bucket.despesa += total;
	}
	const serie = [...seriesBuckets.entries()].map(([mes, bucket]) => {
		const lucroBruto = bucket.receita - bucket.custo;
		const resultado = lucroBruto - bucket.despesa;
		return {
			mes,
			receita: bucket.receita,
			custo: bucket.custo,
			despesa: bucket.despesa,
			lucroBruto,
			resultado,
			margemBruta: bucket.receita > 0 ? (lucroBruto / bucket.receita) * 100 : null,
			margemLiquida: bucket.receita > 0 ? (resultado / bucket.receita) * 100 : null,
		};
	});

	const toNumericRows = (rows: Array<{ creditId: string; debitId: string; total: string | number | null }>) =>
		rows.map((row) => ({ creditId: row.creditId, debitId: row.debitId, total: formatAsNumber(row.total) }));
	const currentTotals = accumulateCategoryTotals(toNumericRows(currentRows), classification);
	const previousTotals = accumulateCategoryTotals(toNumericRows(previousRows), classification);

	const receitaTotal = sumMapValues(currentTotals.revenueByAccount);
	const custoTotal = sumMapValues(currentTotals.costByAccount);
	const despesaTotal = sumMapValues(currentTotals.expenseByAccount);
	const receitaTotalAnterior = sumMapValues(previousTotals.revenueByAccount);
	const custoTotalAnterior = sumMapValues(previousTotals.costByAccount);
	const despesaTotalAnterior = sumMapValues(previousTotals.expenseByAccount);

	const lucroBruto = receitaTotal - custoTotal;
	const resultado = lucroBruto - despesaTotal;
	const lucroBrutoAnterior = receitaTotalAnterior - custoTotalAnterior;
	const resultadoAnterior = lucroBrutoAnterior - despesaTotalAnterior;

	const buildTree = (categoryIds: Set<string>, current: Map<string, number>, previous: Map<string, number>) =>
		buildCategoryTree({ categoryIds, accountById: classification.accountById, currentTotals: current, previousTotals: previous });

	return {
		data: {
			periodo: { inicio: period.after, fim: period.before },
			periodoAnterior: { inicio: previousPeriod.after, fim: previousPeriod.before },
			serie,
			demonstrativo: {
				receita: {
					total: receitaTotal,
					totalAnterior: receitaTotalAnterior,
					arvore: buildTree(classification.revenueIds, currentTotals.revenueByAccount, previousTotals.revenueByAccount),
				},
				custos: {
					total: custoTotal,
					totalAnterior: custoTotalAnterior,
					arvore: buildTree(classification.costIds, currentTotals.costByAccount, previousTotals.costByAccount),
				},
				despesas: {
					total: despesaTotal,
					totalAnterior: despesaTotalAnterior,
					arvore: buildTree(classification.expenseIds, currentTotals.expenseByAccount, previousTotals.expenseByAccount),
				},
				lucroBruto: {
					total: lucroBruto,
					totalAnterior: lucroBrutoAnterior,
					margem: receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : null,
					margemAnterior: receitaTotalAnterior > 0 ? (lucroBrutoAnterior / receitaTotalAnterior) * 100 : null,
				},
				resultado: {
					total: resultado,
					totalAnterior: resultadoAnterior,
					margem: receitaTotal > 0 ? (resultado / receitaTotal) * 100 : null,
					margemAnterior: receitaTotalAnterior > 0 ? (resultadoAnterior / receitaTotalAnterior) * 100 : null,
				},
			},
		},
		message: "DRE calculado com sucesso.",
	};
}
export type TGetFinancesDreOutput = Awaited<ReturnType<typeof getFinancesDre>>;

async function getFinancesDreRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancesDreInputSchema.parse({
		periodAfter: searchParams.get("periodAfter") ?? null,
		periodBefore: searchParams.get("periodBefore") ?? null,
	});
	const result = await getFinancesDre({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancesDreRoute });
