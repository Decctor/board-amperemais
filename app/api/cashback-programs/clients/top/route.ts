import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances } from "@/services/drizzle/schema";
import { desc } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const TopCashbackClientsInputSchema = z.object({
	sortBy: z.enum(["cumulative", "rescued"]).default("cumulative"),
	limit: z.number().int().positive().default(10),
});
export type TTopCashbackClientsInput = z.infer<typeof TopCashbackClientsInputSchema>;

type TTopClient = {
	id: string;
	saldoValorDisponivel: number;
	saldoValorAcumuladoTotal: number;
	saldoValorResgatadoTotal: number;
	cliente: {
		id: string;
		nome: string;
	};
};

type GetResponse = {
	data: {
		clients: TTopClient[];
	};
};

async function getTopCashbackClients({
	input,
	session,
}: {
	input: TTopCashbackClientsInput;
	session: TAuthUserSession["user"];
}): Promise<GetResponse> {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orderByColumn =
		input.sortBy === "cumulative" ? cashbackProgramBalances.saldoValorAcumuladoTotal : cashbackProgramBalances.saldoValorResgatadoTotal;

	const balances = await db.query.cashbackProgramBalances.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		orderBy: [desc(orderByColumn)],
		limit: input.limit,
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
				},
			},
		},
	});

	return {
		data: {
			clients: balances.map((b) => ({
				id: b.id,
				saldoValorDisponivel: b.saldoValorDisponivel,
				saldoValorAcumuladoTotal: b.saldoValorAcumuladoTotal,
				saldoValorResgatadoTotal: b.saldoValorResgatadoTotal,
				cliente: {
					id: b.cliente.id,
					nome: b.cliente.nome,
				},
			})),
		},
	};
}

export type TTopCashbackClientsOutput = Awaited<ReturnType<typeof getTopCashbackClients>>;

const getTopCashbackClientsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = TopCashbackClientsInputSchema.parse(payload);
	const result = await getTopCashbackClients({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const POST = appApiHandler({
	POST: getTopCashbackClientsRoute,
});
