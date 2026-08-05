import { TAuthUserSession } from "@/lib/authentication/types";
import { getDayStringsBetweenDates, isDateOverdue } from "@/lib/dates";
import { canViewFinances } from "@/lib/permissions/finances";
import { FINANCIAL_TRANSFER_METHOD, getAccountChartIdsByNatureza } from "@/lib/finances";
import { getPreviousPeriod } from "@/lib/finances/analytics/periods";
import { db } from "@/services/drizzle";
import { accountingEntries, financialTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import z from "zod";
import { and, eq, gte, inArray, lte, ne, sum } from "drizzle-orm";
import { formatAsNumber } from "@/lib/formatting";
import { appApiHandler } from "@/lib/app-api";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUncached } from "@/lib/authentication/session";

type TGeneralFinancesStatsReduced = {
	totalPendingTransactions: {
		inflow: number;
		outflow: number;
	};
	totalPendingTransactionsForToday: {
		inflow: number;
		outflow: number;
	};
	totalPendingTransactionsOverdue: {
		inflow: number;
		outflow: number;
	};
	daily: {
		[key: string]: {
			expected: number;
			effective: number;
		};
	};
};
type TAccountResult = {
	accountId: string;
	accountName: string;
	totalCredited: number;
	totalDebited: number;
	netBalance: number;
};

const GetFinancesOverallStatsInputSchema = z.object({
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val)),
});
export type TGetFinancesOverallStatsInput = z.infer<typeof GetFinancesOverallStatsInputSchema>;

async function getFinancesOverallStats({ input, session }: { input: TGetFinancesOverallStatsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const { periodAfter, periodBefore } = input;
	const initialDate = dayjs(periodAfter).toISOString();
	const endDate = dayjs(periodBefore).toISOString();
	const datesStrs = getDayStringsBetweenDates({ initialDate, endDate });

	// Query for total credited amounts by account
	const creditedByAccount = await db
		.select({
			accountId: accountingEntries.idContaCredito,
			totalCredited: sum(accountingEntries.valor),
		})
		.from(accountingEntries)
		.where(
			and(
				eq(accountingEntries.organizacaoId, userOrgId),
				gte(accountingEntries.dataCompetencia, periodAfter),
				lte(accountingEntries.dataCompetencia, periodBefore),
			),
		)
		.groupBy(accountingEntries.idContaCredito);

	// Query for total debited amounts by account
	const debitedByAccount = await db
		.select({
			accountId: accountingEntries.idContaDebito,
			totalDebited: sum(accountingEntries.valor),
		})
		.from(accountingEntries)
		.where(
			and(
				eq(accountingEntries.organizacaoId, userOrgId),
				gte(accountingEntries.dataCompetencia, periodAfter),
				lte(accountingEntries.dataCompetencia, periodBefore),
			),
		)
		.groupBy(accountingEntries.idContaDebito);

	// Fetch account details for proper naming
	const accounts = await db.query.accountsCharts.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		columns: {
			id: true,
			nome: true,
			natureza: true,
		},
	});

	// Create account map for easier lookup
	const accountMap = new Map(accounts.map((account) => [account.id, account.nome]));
	const revenueAccountIds = getAccountChartIdsByNatureza(accounts, "RECEITA");
	const expenseAccountIds = getAccountChartIdsByNatureza(accounts, "DESPESA");
	const costAccountIds = getAccountChartIdsByNatureza(accounts, "CUSTO");

	// Combine the results into a single data structure
	const resultMap = new Map<string, TAccountResult>();

	// Process credited amounts
	for (const item of creditedByAccount) {
		const accountName = accountMap.get(item.accountId) || "Unknown Account";
		resultMap.set(item.accountId, {
			accountId: item.accountId,
			accountName,
			totalCredited: formatAsNumber(item.totalCredited),
			totalDebited: 0,
			netBalance: formatAsNumber(item.totalCredited),
		});
	}

	// Process debited amounts
	for (const item of debitedByAccount) {
		if (resultMap.has(item.accountId)) {
			const account = resultMap.get(item.accountId);
			if (!account) continue;
			const debited = formatAsNumber(item.totalDebited);
			const credited = formatAsNumber(account.totalCredited);
			account.totalDebited = debited;
			account.netBalance = credited - debited;
		} else {
			const accountName = accountMap.get(item.accountId) || "Unknown Account";
			const debited = formatAsNumber(item.totalDebited);
			resultMap.set(item.accountId, {
				accountId: item.accountId,
				accountName,
				totalCredited: 0,
				totalDebited: debited,
				netBalance: -debited,
			});
		}
	}
	const resultByAccounts = Array.from(resultMap.values());

	// Soma dos lançamentos de um lado (crédito p/ receita, débito p/ custo e despesa) num intervalo.
	const sumEntriesTotal = async (accountIds: string[], side: "credito" | "debito", range: { after: Date; before: Date }) => {
		if (accountIds.length === 0) return 0;
		const sideColumn = side === "credito" ? accountingEntries.idContaCredito : accountingEntries.idContaDebito;
		const result = await db
			.select({ total: sum(accountingEntries.valor) })
			.from(accountingEntries)
			.where(
				and(
					eq(accountingEntries.organizacaoId, userOrgId),
					gte(accountingEntries.dataCompetencia, range.after),
					lte(accountingEntries.dataCompetencia, range.before),
					inArray(sideColumn, accountIds),
				),
			);
		return formatAsNumber(result[0]?.total || 0);
	};

	const currentRange = { after: periodAfter, before: periodBefore };
	const previousRange = getPreviousPeriod(currentRange);

	const [totalRevenueResultValue, totalExpenseResultValue, totalCostResultValue, previousTotalRevenue, previousTotalExpense, previousTotalCost] =
		await Promise.all([
			sumEntriesTotal(revenueAccountIds, "credito", currentRange),
			sumEntriesTotal(expenseAccountIds, "debito", currentRange),
			sumEntriesTotal(costAccountIds, "debito", currentRange),
			sumEntriesTotal(revenueAccountIds, "credito", previousRange),
			sumEntriesTotal(expenseAccountIds, "debito", previousRange),
			sumEntriesTotal(costAccountIds, "debito", previousRange),
		]);

	// Transferências entre contas zeram no líquido, mas inflariam os fluxos medidos abaixo.
	const totalInFlowResult = await db
		.select({ total: sum(financialTransactions.valor) })
		.from(financialTransactions)
		.where(
			and(
				eq(financialTransactions.organizacaoId, userOrgId),
				eq(financialTransactions.tipo, "ENTRADA"),
				ne(financialTransactions.metodo, FINANCIAL_TRANSFER_METHOD),
				gte(financialTransactions.dataEfetivacao, periodAfter),
				lte(financialTransactions.dataEfetivacao, periodBefore),
			),
		);
	const totalInFlow = totalInFlowResult[0]?.total || 0;

	const totalOutFlowResult = await db
		.select({ total: sum(financialTransactions.valor) })
		.from(financialTransactions)
		.where(
			and(
				eq(financialTransactions.organizacaoId, userOrgId),
				eq(financialTransactions.tipo, "SAIDA"),
				ne(financialTransactions.metodo, FINANCIAL_TRANSFER_METHOD),
				gte(financialTransactions.dataEfetivacao, periodAfter),
				lte(financialTransactions.dataEfetivacao, periodBefore),
			),
		);
	const totalOutFlow = totalOutFlowResult[0]?.total || 0;
	const transactions = await db.query.financialTransactions.findMany({
		where: (fields, { and, or, gte, lte, eq, ne, isNull }) =>
			and(
				eq(fields.organizacaoId, userOrgId),
				ne(fields.metodo, FINANCIAL_TRANSFER_METHOD),
				or(isNull(fields.dataEfetivacao), and(gte(fields.dataEfetivacao, periodAfter), lte(fields.dataEfetivacao, periodBefore))),
			),
		columns: {
			tipo: true,
			valor: true,
			dataPrevisao: true,
			dataEfetivacao: true,
		},
	});

	const initialReducedAcc: TGeneralFinancesStatsReduced = {
		totalPendingTransactions: {
			inflow: 0,
			outflow: 0,
		},
		totalPendingTransactionsForToday: {
			inflow: 0,
			outflow: 0,
		},
		totalPendingTransactionsOverdue: {
			inflow: 0,
			outflow: 0,
		},
		daily: datesStrs.reduce((acc: TGeneralFinancesStatsReduced["daily"], current) => {
			acc[current] = { expected: 0, effective: 0 };
			return acc;
		}, {}),
	};

	const reduced = transactions.reduce((acc: TGeneralFinancesStatsReduced, current) => {
		const transactionType = current.tipo;
		const transactionValue = current.valor;
		const transactionExpectedDate = current.dataPrevisao;
		const transactionExpectedDay = dayjs(transactionExpectedDate).format("DD/MM");
		const transactionEffectiveDate = current.dataEfetivacao || null;
		const transactionEffectiveDay = dayjs(transactionEffectiveDate).format("DD/MM");

		if (transactionEffectiveDate) {
			if (acc.daily[transactionEffectiveDay])
				acc.daily[transactionEffectiveDay].effective += transactionType === "ENTRADA" ? +transactionValue : -transactionValue;
		} else {
			// Defining flags based on the transaction date
			const currentDateDayJs = dayjs();
			const transactionIsForToday = transactionExpectedDate && dayjs(transactionExpectedDate).isSame(new Date(), "day");
			const transactionIsOverdue =
				transactionExpectedDate && isDateOverdue({ date: transactionExpectedDate, inRelationTo: currentDateDayJs, useEndOfDay: true });

			if (transactionType === "ENTRADA") {
				acc.totalPendingTransactions.inflow += transactionValue;
				// Updating the daily holder
				if (acc.daily[transactionExpectedDay]) acc.daily[transactionExpectedDay].expected += +transactionValue;
				if (transactionIsForToday) acc.totalPendingTransactionsForToday.inflow += transactionValue;
				if (transactionIsOverdue) acc.totalPendingTransactionsOverdue.inflow += transactionValue;
			} else {
				acc.totalPendingTransactions.outflow += transactionValue;
				// Updating the daily holder
				if (acc.daily[transactionExpectedDay]) acc.daily[transactionExpectedDay].expected += -transactionValue;
				if (transactionIsForToday) acc.totalPendingTransactionsForToday.outflow += transactionValue;
				if (transactionIsOverdue) acc.totalPendingTransactionsOverdue.outflow += transactionValue;
			}
		}
		return acc;
	}, initialReducedAcc);

	return {
		data: {
			resultByAccounts,
			totalRevenue: totalRevenueResultValue,
			totalExpense: totalExpenseResultValue,
			totalCost: totalCostResultValue,
			// Mesmas métricas na janela imediatamente anterior de duração idêntica, para deltas na UI.
			// Campos em inglês por consistência com o payload legado deste endpoint.
			previous: {
				totalRevenue: previousTotalRevenue,
				totalExpense: previousTotalExpense,
				totalCost: previousTotalCost,
			},
			totalInFlow,
			totalOutFlow,
			totalPendingTransactions: reduced.totalPendingTransactions,
			totalPendingTransactionsForToday: reduced.totalPendingTransactionsForToday,
			totalPendingTransactionsOverdue: reduced.totalPendingTransactionsOverdue,
			daily: Object.entries(reduced.daily).map(([key, value]) => ({ day: key, ...value })),
		},
	};
}
export type TGetFinancesOverallStatsOutput = Awaited<ReturnType<typeof getFinancesOverallStats>>;

async function getFinancesOverallStatsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancesOverallStatsInputSchema.parse({
		periodAfter: searchParams.get("periodAfter") ?? null,
		periodBefore: searchParams.get("periodBefore") ?? null,
	});
	const result = await getFinancesOverallStats({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancesOverallStatsRoute });
