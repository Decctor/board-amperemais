import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createWhatsappTemplate as createWhatsappTemplateInMeta } from "@/lib/whatsapp/template-management";
import { WhatsappTemplateSchema } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { whatsappTemplates } from "@/services/drizzle/schema";
import { and, count, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";
const CreateWhatsappTemplateInputSchema = z.object({
	template: WhatsappTemplateSchema.omit({ whatsappTemplateId: true, qualidade: true, rejeicao: true, status: true }),
});
export type TCreateWhatsappTemplateInput = z.infer<typeof CreateWhatsappTemplateInputSchema>;

async function createWhatsappTemplate({ input, session }: { input: TCreateWhatsappTemplateInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const insertedWhatsappTemplate = await db
		.insert(whatsappTemplates)
		.values({ ...input.template, status: "RASCUNHO", qualidade: "PENDENTE", organizacaoId: userOrgId })
		.returning({ id: whatsappTemplates.id });

	const createdWhatsappTemplateResponse = await createWhatsappTemplateInMeta({ template: { ...input.template, qualidade: "PENDENTE" } });

	console.log("[INFO] [WHATSAPP_TEMPLATE_CREATE] Meta response:", createdWhatsappTemplateResponse);
	const insertedWhatsappTemplateId = insertedWhatsappTemplate[0]?.id;
	if (!insertedWhatsappTemplateId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar template.");
	await db
		.update(whatsappTemplates)
		.set({ whatsappTemplateId: createdWhatsappTemplateResponse.whatsappTemplateId })
		.where(and(eq(whatsappTemplates.id, insertedWhatsappTemplateId), eq(whatsappTemplates.organizacaoId, userOrgId)));

	return {
		data: {
			insertedId: insertedWhatsappTemplateId,
			metaWhatsappTemplateId: createdWhatsappTemplateResponse.whatsappTemplateId,
		},
		message: "Template criado com sucesso.",
	};
}
export type TCreateWhatsappTemplateOutput = Awaited<ReturnType<typeof createWhatsappTemplate>>;
async function createWhatsappTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = CreateWhatsappTemplateInputSchema.parse(payload);
	const result = await createWhatsappTemplate({ input, session: session.user });
	return NextResponse.json(result, { status: 201 });
}
export const POST = appApiHandler({
	POST: createWhatsappTemplateRoute,
});

const GetWhatsappTemplatesInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do template." }).optional().nullable(),

	// Default
	page: z
		.string({ invalid_type_error: "Tipo inválido para páginação." })
		.optional()
		.nullable()
		.transform((val) => Number(val)),
	search: z.string({ invalid_type_error: "Tipo inválido para busca." }).optional().nullable(),
});
export type TGetWhatsappTemplatesInput = z.infer<typeof GetWhatsappTemplatesInputSchema>;

async function getWhatsappTemplates({ input, session }: { input: TGetWhatsappTemplatesInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if ("id" in input && input.id) {
		const id = input.id;
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");
		const whatsappTemplate = await db.query.whatsappTemplates.findFirst({
			where: (fields, { eq }) => and(eq(fields.id, id), eq(fields.organizacaoId, userOrgId)),
		});
		if (!whatsappTemplate) throw new createHttpError.NotFound("Template não encontrado.");
		return {
			data: {
				default: null,
				byId: whatsappTemplate,
			},
			message: "Template encontrado com sucesso.",
		};
	}

	const conditions = [];
	if (input.search && input.search.trim().length > 0) {
		conditions.push(
			sql`(to_tsvector('portuguese', ${whatsappTemplates.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${whatsappTemplates.nome} ILIKE '%' || ${input.search} || '%')`,
		);
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedWhatsappTemplatesResult = await db
		.select({ count: count() })
		.from(whatsappTemplates)
		.where(and(...conditions, eq(whatsappTemplates.organizacaoId, userOrgId)));
	const matchedWhatsappTemplatesCount = matchedWhatsappTemplatesResult[0]?.count ?? 0;

	const totalPages = Math.ceil(matchedWhatsappTemplatesCount / PAGE_SIZE);

	const whatsappTemplatesResult = await db.query.whatsappTemplates.findMany({
		where: and(...conditions, eq(whatsappTemplates.organizacaoId, userOrgId)),
		columns: {
			id: true,
			nome: true,
			categoria: true,
			whatsappTemplateId: true,
			qualidade: true,
			rejeicao: true,
			dataInsercao: true,
			status: true,
		},
		with: {
			autor: {
				columns: {
					id: true,
					nome: true,
					avatarUrl: true,
				},
			},
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
		offset: skip,
		limit: PAGE_SIZE,
	});

	return {
		data: {
			default: {
				whatsappTemplates: whatsappTemplatesResult,
				whatsappTemplatesMatched: matchedWhatsappTemplatesCount,
				totalPages: totalPages,
			},
			byId: null,
		},
		message: "Templates encontrados com sucesso.",
	};
}

export type TGetWhatsappTemplatesOutput = Awaited<ReturnType<typeof getWhatsappTemplates>>;
export type TGetWhatsappTemplatesOutputDefault = Exclude<TGetWhatsappTemplatesOutput["data"]["default"], null>;
export type TGetWhatsappTemplatesOutputById = Exclude<TGetWhatsappTemplatesOutput["data"]["byId"], null>;
async function getWhatsappTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const searchParams = await request.nextUrl.searchParams;
	const input = GetWhatsappTemplatesInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		page: searchParams.get("page") ?? undefined,
	});
	const result = await getWhatsappTemplates({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
}
export const GET = appApiHandler({
	GET: getWhatsappTemplatesRoute,
});

const UpdateWhatsappTemplateInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do template." }),
	template: WhatsappTemplateSchema.omit({ whatsappTemplateId: true, qualidade: true, rejeicao: true, status: true }),
});
export type TUpdateWhatsappTemplateInput = z.infer<typeof UpdateWhatsappTemplateInputSchema>;
