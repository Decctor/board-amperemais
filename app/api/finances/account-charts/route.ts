import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { accountsCharts } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAccountChartsInputSchema = z.object({
	id: z
		.string({
			invalid_type_error: "Tipo inválido para ID da conta contabil.",
		})
		.optional()
		.nullable(),
	search: z
		.string({
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
});
export type TGetAccountChartsInput = z.infer<typeof GetAccountChartsInputSchema>;
export type TGetAccountChartsInputById = Omit<TGetAccountChartsInput, "search">;
export type TGetAccountChartsInputDefault = Omit<TGetAccountChartsInput, "id">;

async function getAccountCharts({ input, session }: { input: TGetAccountChartsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { id, search } = input;

	if (id) {
		const accountChart = await db.query.accountsCharts.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.organizacaoId, userOrgId), eq(fields.id, id)),
		});
		if (!accountChart) throw new createHttpError.NotFound("Conta contabil não encontrada.");
		return {
			data: {
				default: null,
				byId: accountChart,
			},
		};
	}

	const conditions = [eq(accountsCharts.organizacaoId, userOrgId)];

	if (search && search.trim().length > 0) {
		const searchCondition = createSimplifiedSearchCondition(accountsCharts.nome, search);
		if (searchCondition) {
			conditions.push(searchCondition);
		}
	}
	const accountCharts = await db.query.accountsCharts.findMany({
		where: (fields, { and }) => and(...conditions),
	});
	return {
		data: {
			default: accountCharts,
			byId: null,
		},
	};
}
export type TGetAccountChartsOutput = Awaited<ReturnType<typeof getAccountCharts>>;
export type TGetAccountChartsOutputDefault = Exclude<TGetAccountChartsOutput["data"]["default"], null>;
export type TGetAccountChartsOutputById = Exclude<TGetAccountChartsOutput["data"]["byId"], null>;

async function getAccountChartsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetAccountChartsInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		search: searchParams.get("search") ?? undefined,
	});

	const result = await getAccountCharts({ input, session });
	return NextResponse.json(result);
}
export const GET = appApiHandler({ GET: getAccountChartsRoute });
