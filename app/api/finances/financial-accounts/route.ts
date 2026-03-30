import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { financialAccounts } from "@/services/drizzle/schema";
import { and, asc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetFinancialAccountsInputSchema = z.object({
	activeOnly: z.enum(["true", "false"]).optional().default("true"),
});
export type TGetFinancialAccountsInput = z.infer<typeof GetFinancialAccountsInputSchema>;

async function getFinancialAccounts({ input, session }: { input: TGetFinancialAccountsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { activeOnly } = input;

	const conditions = [eq(financialAccounts.organizacaoId, userOrgId)];
	if (activeOnly === "true") conditions.push(eq(financialAccounts.ativo, true));

	const accountsResult = await db.query.financialAccounts.findMany({
		where: and(...conditions),
		with: {
			contaContabil: { columns: { id: true, nome: true } },
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
	});

	return {
		data: {
			default: {
				accounts: accountsResult,
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
	});
	const result = await getFinancialAccounts({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFinancialAccountsRoute });
