import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { accountingEntries } from "@/services/drizzle/schema";
import { and, count, eq, gte, ilike, inArray, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { AccountingEntryOriginTypeEnum, TAccountingEntryOriginTypeEnum } from "@/schemas/enums";

const GetAccountingEntriesInputSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	search: z.string().optional().nullable(),
	periodAfter: z
		.string()
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	periodBefore: z
		.string()
		.datetime({ message: "Tipo inválido para período." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	originTypes: z
		.string({
			invalid_type_error: "Tipo inválido para os tipos de origem.",
		})
		.transform((val) => val.split(",").filter((v) => AccountingEntryOriginTypeEnum.safeParse(v).success) as TAccountingEntryOriginTypeEnum[])
		.optional()
		.nullable(),
});
export type TGetAccountingEntriesInput = z.infer<typeof GetAccountingEntriesInputSchema>;

async function getAccountingEntries({ input, session }: { input: TGetAccountingEntriesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { page, search, periodAfter, periodBefore, originTypes } = input;

	const conditions = [eq(accountingEntries.organizacaoId, userOrgId)];
	if (search && search.trim().length > 0) conditions.push(ilike(accountingEntries.titulo, `%${search.trim()}%`));
	if (periodAfter) conditions.push(gte(accountingEntries.dataCompetencia, periodAfter));
	if (periodBefore) conditions.push(lte(accountingEntries.dataCompetencia, periodBefore));
	if (originTypes && originTypes.length > 0) conditions.push(inArray(accountingEntries.origemTipo, originTypes));

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (page - 1);

	const [countResult, entriesResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(accountingEntries)
			.where(and(...conditions)),
		db.query.accountingEntries.findMany({
			where: and(...conditions),
			with: {
				contaDebito: { columns: { id: true, nome: true } },
				contaCredito: { columns: { id: true, nome: true } },
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
			},
			orderBy: (fields, { desc }) => desc(fields.dataInsercao),
			limit: PAGE_SIZE,
			offset: skip,
		}),
	]);

	const entriesMatched = countResult[0]?.count ?? 0;
	const totalPages = Math.ceil(entriesMatched / PAGE_SIZE);

	return {
		data: {
			default: {
				entries: entriesResult,
				entriesMatched,
				totalPages,
			},
		},
	};
}
export type TGetAccountingEntriesOutput = Awaited<ReturnType<typeof getAccountingEntries>>;
export type TGetAccountingEntriesOutputDefault = Exclude<TGetAccountingEntriesOutput["data"]["default"], null>;

async function getAccountingEntriesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetAccountingEntriesInputSchema.parse({
		page: searchParams.get("page") ?? 1,
		search: searchParams.get("search") ?? undefined,
		periodAfter: searchParams.get("periodAfter") ?? undefined,
		periodBefore: searchParams.get("periodBefore") ?? undefined,
		originTypes: searchParams.get("originTypes") ?? undefined,
	});
	const result = await getAccountingEntries({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAccountingEntriesRoute });
