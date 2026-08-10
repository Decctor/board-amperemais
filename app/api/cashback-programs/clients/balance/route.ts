import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, clients } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetCashbackBalancesInputSchema = z.object({
	clientId: z.string({ invalid_type_error: "Tipo não válido para ID do cliente." }).optional().nullable(),
	page: z
		.string({ invalid_type_error: "Tipo não válido para página." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 1)),
	limit: z
		.string({ invalid_type_error: "Tipo não válido para limite." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 20)),
	search: z
		.string({ invalid_type_error: "Tipo não válido para busca." })
		.optional()
		.nullable()
		.transform((value) => value?.trim() ?? ""),
	orderByField: z
		.enum(["clienteNome", "saldoValorDisponivel", "saldoValorAcumuladoTotal", "saldoValorResgatadoTotal"])
		.optional()
		.nullable()
		.transform((value) => value ?? "saldoValorDisponivel"),
	orderByDirection: z
		.enum(["asc", "desc"])
		.optional()
		.nullable()
		.transform((value) => value ?? "desc"),
});
export type TGetCashbackBalancesInput = z.infer<typeof GetCashbackBalancesInputSchema>;

async function getCashbackBalances({ input, session }: { input: TGetCashbackBalancesInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (input.clientId) {
		const balance = await db.query.cashbackProgramBalances.findFirst({
			where: and(eq(cashbackProgramBalances.organizacaoId, organizationId), eq(cashbackProgramBalances.clienteId, input.clientId)),
			columns: {
				id: true,
				clienteId: true,
				programaId: true,
				saldoValorDisponivel: true,
				saldoValorAcumuladoTotal: true,
				saldoValorResgatadoTotal: true,
			},
		});

		return {
			data: {
				byClientId: balance ?? {
					id: null,
					clienteId: input.clientId,
					programaId: null,
					saldoValorDisponivel: 0,
					saldoValorAcumuladoTotal: 0,
					saldoValorResgatadoTotal: 0,
				},
				default: null,
			},
			message: "Saldo de cashback carregado com sucesso.",
		};
	}

	const conditions = [eq(cashbackProgramBalances.organizacaoId, organizationId)];
	if (input.search) {
		conditions.push(createSimplifiedSearchCondition(clients.nome, input.search));
	}

	const direction = input.orderByDirection === "desc" ? desc : asc;
	const orderByColumn =
		input.orderByField === "saldoValorDisponivel"
			? cashbackProgramBalances.saldoValorDisponivel
			: input.orderByField === "saldoValorAcumuladoTotal"
				? cashbackProgramBalances.saldoValorAcumuladoTotal
				: input.orderByField === "saldoValorResgatadoTotal"
					? cashbackProgramBalances.saldoValorResgatadoTotal
					: clients.nome;
	const offset = (input.page - 1) * input.limit;

	const [countResult, balances] = await Promise.all([
		db
			.select({ count: count() })
			.from(cashbackProgramBalances)
			.innerJoin(clients, eq(cashbackProgramBalances.clienteId, clients.id))
			.where(and(...conditions)),
		db
			.select({
				id: cashbackProgramBalances.id,
				clienteId: cashbackProgramBalances.clienteId,
				programaId: cashbackProgramBalances.programaId,
				saldoValorDisponivel: cashbackProgramBalances.saldoValorDisponivel,
				saldoValorAcumuladoTotal: cashbackProgramBalances.saldoValorAcumuladoTotal,
				saldoValorResgatadoTotal: cashbackProgramBalances.saldoValorResgatadoTotal,
				cliente: { id: clients.id, nome: clients.nome },
			})
			.from(cashbackProgramBalances)
			.innerJoin(clients, eq(cashbackProgramBalances.clienteId, clients.id))
			.where(and(...conditions))
			.orderBy(direction(orderByColumn))
			.limit(input.limit)
			.offset(offset),
	]);

	const balancesMatched = countResult[0]?.count ?? 0;
	return {
		data: {
			byClientId: null,
			default: {
				balances,
				balancesMatched,
				totalPages: Math.ceil(balancesMatched / input.limit),
			},
		},
		message: "Saldos de cashback carregados com sucesso.",
	};
}

export type TGetCashbackBalancesOutput = Awaited<ReturnType<typeof getCashbackBalances>>;
export type TGetCashbackBalancesOutputDefault = NonNullable<TGetCashbackBalancesOutput["data"]["default"]>;
export type TGetCashbackBalanceOutputByClientId = NonNullable<TGetCashbackBalancesOutput["data"]["byClientId"]>;

async function getCashbackBalancesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const { searchParams } = new URL(request.url);
	const input = GetCashbackBalancesInputSchema.parse({
		clientId: searchParams.get("clientId"),
		page: searchParams.get("page"),
		limit: searchParams.get("limit"),
		search: searchParams.get("search"),
		orderByField: searchParams.get("orderByField"),
		orderByDirection: searchParams.get("orderByDirection"),
	});
	const result = await getCashbackBalances({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getCashbackBalancesRoute });
