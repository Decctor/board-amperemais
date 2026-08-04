import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewFinances } from "@/lib/permissions/finances";
import {
	deriveCreditCardInvoice,
	getCreditCardInvoiceDateKey,
	groupCreditCardInvoiceTransactions,
	type TCreditCardInvoiceTransaction,
} from "@/lib/finances/credit-card-invoice";
import { db } from "@/services/drizzle";
import { accountingEntries, financialAccounts, financialTransactions } from "@/services/drizzle/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import dayjs from "dayjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetCreditCardInvoicesInputSchema = z.object({
	contaFinanceiraId: z.string({ invalid_type_error: "Tipo inválido para a conta do cartão." }).optional().nullable(),
	dataVencimento: z
		.string({ invalid_type_error: "Tipo inválido para a data de vencimento." })
		.datetime({ message: "Tipo inválido para a data de vencimento." })
		.transform((value) => new Date(value))
		.optional()
		.nullable(),
	periodAfter: z
		.string({ invalid_type_error: "Tipo inválido para o período inicial." })
		.datetime({ message: "Tipo inválido para o período inicial." })
		.transform((value) => new Date(value))
		.optional()
		.nullable(),
	periodBefore: z
		.string({ invalid_type_error: "Tipo inválido para o período final." })
		.datetime({ message: "Tipo inválido para o período final." })
		.transform((value) => new Date(value))
		.optional()
		.nullable(),
});
export type TGetCreditCardInvoicesInput = z.infer<typeof GetCreditCardInvoicesInputSchema>;

async function getCreditCardInvoices({ input, orgId }: { input: TGetCreditCardInvoicesInput; orgId: string }) {
	const accountConditions = [eq(financialAccounts.organizacaoId, orgId), eq(financialAccounts.tipo, "CARTAO_CREDITO" as const)];
	if (input.contaFinanceiraId) accountConditions.push(eq(financialAccounts.id, input.contaFinanceiraId));
	const accounts = await db.query.financialAccounts.findMany({
		where: and(...accountConditions),
		columns: { id: true, nome: true, tipo: true },
	});
	if (input.contaFinanceiraId && accounts.length === 0) throw new createHttpError.NotFound("Cartão de crédito não encontrado.");
	if (accounts.length === 0) return { data: { default: [], byId: null } };

	const conditions = [
		eq(financialTransactions.organizacaoId, orgId),
		inArray(
			financialTransactions.contaFinanceiraId,
			accounts.map((account) => account.id),
		),
	];
	if (input.dataVencimento) {
		const start = dayjs(input.dataVencimento).startOf("day").toDate();
		const end = dayjs(input.dataVencimento).add(1, "day").startOf("day").toDate();
		conditions.push(gte(financialTransactions.dataPrevisao, start), lte(financialTransactions.dataPrevisao, end));
	} else {
		if (input.periodAfter) conditions.push(gte(financialTransactions.dataPrevisao, input.periodAfter));
		if (input.periodBefore) conditions.push(lte(financialTransactions.dataPrevisao, input.periodBefore));
	}

	const rows = await db
		.select({
			id: financialTransactions.id,
			contaFinanceiraId: financialTransactions.contaFinanceiraId,
			contaFinanceiraNome: financialAccounts.nome,
			titulo: financialTransactions.titulo,
			tipo: financialTransactions.tipo,
			valor: financialTransactions.valor,
			valorBase: financialTransactions.valorBase,
			valorJuros: financialTransactions.valorJuros,
			valorMulta: financialTransactions.valorMulta,
			valorTaxas: financialTransactions.valorTaxas,
			valorDesconto: financialTransactions.valorDesconto,
			metodo: financialTransactions.metodo,
			dataPrevisao: financialTransactions.dataPrevisao,
			dataEfetivacao: financialTransactions.dataEfetivacao,
			parcela: financialTransactions.parcela,
			totalParcelas: financialTransactions.totalParcelas,
			provedorStatus: financialTransactions.provedorStatus,
			lancamentoContabilId: financialTransactions.lancamentoContabilId,
			origemTipo: accountingEntries.origemTipo,
		})
		.from(financialTransactions)
		.innerJoin(financialAccounts, eq(financialAccounts.id, financialTransactions.contaFinanceiraId))
		.innerJoin(accountingEntries, eq(accountingEntries.id, financialTransactions.lancamentoContabilId))
		.where(and(...conditions));

	const accountById = new Map(accounts.map((account) => [account.id, account]));
	const rowsByGroup = groupCreditCardInvoiceTransactions(rows as TCreditCardInvoiceTransaction[]);
	const invoices = Array.from(rowsByGroup.entries())
		.map(([key, transactions]) => {
			const [contaFinanceiraId, dataVencimento] = key.split(":");
			const account = accountById.get(contaFinanceiraId);
			const invoice = deriveCreditCardInvoice({ contaFinanceiraId, dataVencimento, transactions });
			return { ...invoice, contaFinanceiraNome: account?.nome ?? "Cartão de crédito" };
		})
		.sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));

	const requestedDueDate = input.dataVencimento;
	const byId =
		input.contaFinanceiraId && requestedDueDate
			? (invoices.find(
					(invoice) => invoice.contaFinanceiraId === input.contaFinanceiraId && invoice.dataVencimento === getCreditCardInvoiceDateKey(requestedDueDate),
				) ?? null)
			: null;

	return { data: { default: invoices, byId } };
}
export type TGetCreditCardInvoicesOutput = Awaited<ReturnType<typeof getCreditCardInvoices>>;
export type TGetCreditCardInvoiceOutput = NonNullable<TGetCreditCardInvoicesOutput["data"]["byId"]>;

async function getCreditCardInvoicesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!canViewFinances(session.membership?.permissoes)) throw new createHttpError.Forbidden("Acesso restrito ao módulo financeiro.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	const params = request.nextUrl.searchParams;
	const input = GetCreditCardInvoicesInputSchema.parse({
		contaFinanceiraId: params.get("contaFinanceiraId") ?? undefined,
		dataVencimento: params.get("dataVencimento") ?? undefined,
		periodAfter: params.get("periodAfter") ?? undefined,
		periodBefore: params.get("periodBefore") ?? undefined,
	});
	return NextResponse.json(await getCreditCardInvoices({ input, orgId }));
}

export const GET = appApiHandler({ GET: getCreditCardInvoicesRoute });
