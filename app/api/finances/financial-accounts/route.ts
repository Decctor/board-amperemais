import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { financialAccounts, financialTransactions } from "@/services/drizzle/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetFinancialAccountsInputSchema = z.object({
	stats: z
		.string()
		.optional()
		.default("false")
		.transform((val) => val === "true"),
	activeOnly: z
		.string()
		.optional()
		.default("true")
		.transform((val) => val === "true"),
	statsPeriodBefore: z
		.string({ invalid_type_error: "Tipo não válido para data de venda antes da data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodAfter: z
		.string({ invalid_type_error: "Tipo não válido para data de venda após a data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
});
export type TGetFinancialAccountsInput = z.infer<typeof GetFinancialAccountsInputSchema>;

type AccountStats = {
	saldoAtual: number;
	totalEntradas: number;
	totalSaidas: number;
};

async function getFinancialAccounts({ input, session }: { input: TGetFinancialAccountsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { activeOnly, stats, statsPeriodBefore, statsPeriodAfter } = input;

	const conditions = [eq(financialAccounts.organizacaoId, userOrgId)];
	if (activeOnly) conditions.push(eq(financialAccounts.ativo, true));

	const accountsResult = await db.query.financialAccounts.findMany({
		where: and(...conditions),
		with: {
			contaContabil: { columns: { id: true, nome: true } },
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
	});

	let statsMap: Record<string, AccountStats> = {};

	if (stats && accountsResult.length > 0) {
		const accountIds = accountsResult.map((a) => a.id);

		const allTransactions = await db
			.select({
				contaFinanceiraId: financialTransactions.contaFinanceiraId,
				tipo: financialTransactions.tipo,
				valor: financialTransactions.valor,
				dataEfetivacao: financialTransactions.dataEfetivacao,
			})
			.from(financialTransactions)
			.where(
				and(
					eq(financialTransactions.organizacaoId, userOrgId),
					isNotNull(financialTransactions.dataEfetivacao),
					inArray(financialTransactions.contaFinanceiraId, accountIds),
				),
			);

		for (const account of accountsResult) {
			const accountTxs = allTransactions.filter((t) => t.contaFinanceiraId === account.id);

			// saldoAtual: initial balance + all effected transactions since dataSaldoInicial
			const balanceTxs = accountTxs.filter((t) => t.dataEfetivacao && new Date(t.dataEfetivacao) >= new Date(account.dataSaldoInicial));
			const saldoAtual = account.saldoInicial + balanceTxs.reduce((sum, t) => sum + (t.tipo === "ENTRADA" ? t.valor : -t.valor), 0);

			// Period-filtered stats
			const periodTxs = accountTxs.filter((t) => {
				const date = new Date(t.dataEfetivacao!);
				const afterOk = !statsPeriodAfter || date >= statsPeriodAfter;
				const beforeOk = !statsPeriodBefore || date <= statsPeriodBefore;
				return afterOk && beforeOk;
			});

			const totalEntradas = periodTxs.filter((t) => t.tipo === "ENTRADA").reduce((sum, t) => sum + t.valor, 0);
			const totalSaidas = periodTxs.filter((t) => t.tipo === "SAIDA").reduce((sum, t) => sum + t.valor, 0);

			statsMap[account.id] = { saldoAtual, totalEntradas, totalSaidas };
		}
	}

	const accountsWithStats = accountsResult.map((account) => ({
		...account,
		estatisticas: statsMap[account.id] ?? null,
	}));

	return {
		data: {
			default: {
				accounts: accountsWithStats,
			},
		},
	};
}
export type TGetFinancialAccountsOutput = Awaited<ReturnType<typeof getFinancialAccounts>>;
export type TGetFinancialAccountsOutputDefault = Exclude<TGetFinancialAccountsOutput["data"]["default"], null>;

async function getFinancialAccountsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetFinancialAccountsInputSchema.parse({
		activeOnly: searchParams.get("activeOnly") ?? "true",
		stats: searchParams.get("stats") ?? "false",
		statsPeriodAfter: searchParams.get("statsPeriodAfter") ?? null,
		statsPeriodBefore: searchParams.get("statsPeriodBefore") ?? null,
	});
	const result = await getFinancialAccounts({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancialAccountsRoute });
