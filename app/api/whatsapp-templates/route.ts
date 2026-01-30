import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createWhatsappTemplate as createWhatsappTemplateInMeta } from "@/lib/whatsapp/template-management";
import { WhatsappTemplateSchema } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { whatsappTemplatePhones, whatsappTemplates } from "@/services/drizzle/schema";
import { and, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";
const CreateWhatsappTemplateInputSchema = z.object({
	template: WhatsappTemplateSchema.omit({ autorId: true, dataInsercao: true }),
});
export type TCreateWhatsappTemplateInput = z.infer<typeof CreateWhatsappTemplateInputSchema>;

async function createWhatsappTemplate({ input, session }: { input: TCreateWhatsappTemplateInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orgWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: {
			telefones: true,
		},
	});
	if (!orgWhatsappConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");
	if (orgWhatsappConnection.telefones.length === 0) throw new createHttpError.NotFound("Nenhum telefone cadastrado na conexão WhatsApp.");

	const whatsappConnectionType = orgWhatsappConnection.tipoConexao;
	const whatsappToken = orgWhatsappConnection.token;

	// 1. Insert parent template first
	const [insertedTemplate] = await db
		.insert(whatsappTemplates)
		.values({
			nome: input.template.nome,
			categoria: input.template.categoria,
			componentes: input.template.componentes,
			autorId: session.user.id,
			organizacaoId: userOrgId,
		})
		.returning({ id: whatsappTemplates.id });

	const phoneResults: Array<{ telefoneId: string; whatsappTemplateId: string | null; error?: string }> = [];

	if (whatsappConnectionType === "META_CLOUD_API" && whatsappToken) {
		// 2. Create template in Meta API for each phone and insert child records

		for (const telefone of orgWhatsappConnection.telefones) {
			if (!telefone.whatsappBusinessAccountId) continue;
			try {
				const metaResponse = await createWhatsappTemplateInMeta({
					whatsappToken,
					whatsappBusinessAccountId: telefone.whatsappBusinessAccountId,
					template: input.template,
				});

				// Insert child record with the whatsappTemplateId from Meta
				await db.insert(whatsappTemplatePhones).values({
					templateId: insertedTemplate.id,
					telefoneId: telefone.id,
					whatsappTemplateId: metaResponse.whatsappTemplateId,
					status: "PENDENTE",
					qualidade: "PENDENTE",
				});

				phoneResults.push({
					telefoneId: telefone.id,
					whatsappTemplateId: metaResponse.whatsappTemplateId,
				});

				console.log(`[INFO] [WHATSAPP_TEMPLATE_CREATE] Created template for phone ${telefone.numero}: ${metaResponse.whatsappTemplateId}`);
			} catch (error) {
				console.error(`[ERROR] [WHATSAPP_TEMPLATE_CREATE] Failed to create template for phone ${telefone.numero}:`, error);
				phoneResults.push({
					telefoneId: telefone.id,
					whatsappTemplateId: null,
					error: error instanceof Error ? error.message : "Erro desconhecido",
				});
			}
		}
	}
	const successfulPhones = phoneResults.filter((r) => r.whatsappTemplateId !== null);
	const failedPhones = phoneResults.filter((r) => r.whatsappTemplateId === null);
	return {
		data: {
			insertedId: insertedTemplate.id,
			phoneResults: {
				successful: successfulPhones.length,
				failed: failedPhones.length,
				details: phoneResults,
			},
		},
		message:
			failedPhones.length > 0
				? `Template criado com ${successfulPhones.length} telefone(s) e ${failedPhones.length} falha(s).`
				: "Template criado com sucesso em todos os telefones.",
	};
}
export type TCreateWhatsappTemplateOutput = Awaited<ReturnType<typeof createWhatsappTemplate>>;
async function createWhatsappTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = CreateWhatsappTemplateInputSchema.parse(payload);
	const result = await createWhatsappTemplate({ input, session });
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
	whatsappConnectionPhoneId: z.string({ invalid_type_error: "Tipo inválido para ID do telefone." }).optional().nullable(),
});
export type TGetWhatsappTemplatesInput = z.infer<typeof GetWhatsappTemplatesInputSchema>;

// Helper to compute worst-case status (priority: REJEITADO > DESABILITADO > PAUSADO > PENDENTE > APROVADO > RASCUNHO)
function computeWorstStatus(
	statuses: Array<"RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "PAUSADO" | "DESABILITADO">,
): "RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "PAUSADO" | "DESABILITADO" {
	const priority = ["REJEITADO", "DESABILITADO", "PAUSADO", "PENDENTE", "RASCUNHO", "APROVADO"] as const;
	for (const status of priority) {
		if (statuses.includes(status)) return status;
	}
	return "PENDENTE";
}

// Helper to compute worst-case quality (priority: BAIXA > MEDIA > PENDENTE > ALTA)
function computeWorstQuality(qualities: Array<"PENDENTE" | "ALTA" | "MEDIA" | "BAIXA">): "PENDENTE" | "ALTA" | "MEDIA" | "BAIXA" {
	const priority = ["BAIXA", "MEDIA", "PENDENTE", "ALTA"] as const;
	for (const quality of priority) {
		if (qualities.includes(quality)) return quality;
	}
	return "PENDENTE";
}

async function getWhatsappTemplates({ input, session }: { input: TGetWhatsappTemplatesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if ("id" in input && input.id) {
		const id = input.id;
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");
		const whatsappTemplate = await db.query.whatsappTemplates.findFirst({
			where: (fields, { eq, or, isNull }) => and(eq(fields.id, id), or(eq(fields.organizacaoId, userOrgId), isNull(fields.organizacaoId))),
			with: {
				telefones: {
					with: {
						telefone: {
							columns: {
								id: true,
								numero: true,
								nome: true,
							},
						},
					},
				},
			},
		});
		if (!whatsappTemplate) throw new createHttpError.NotFound("Template não encontrado.");

		// Compute overall status and quality from phone statuses
		const phoneStatuses = whatsappTemplate.telefones.map((t) => t.status);
		const phoneQualities = whatsappTemplate.telefones.map((t) => t.qualidade);
		const statusGeral = phoneStatuses.length > 0 ? computeWorstStatus(phoneStatuses) : "PENDENTE";
		const qualidadeGeral = phoneQualities.length > 0 ? computeWorstQuality(phoneQualities) : "PENDENTE";

		return {
			data: {
				default: null,
				byId: {
					...whatsappTemplate,
					statusGeral,
					qualidadeGeral,
					telefones: whatsappTemplate.telefones.map((t) => ({
						id: t.id,
						telefoneId: t.telefoneId,
						telefoneNumero: t.telefone?.numero,
						telefoneName: t.telefone?.nome,
						whatsappTemplateId: t.whatsappTemplateId,
						status: t.status,
						qualidade: t.qualidade,
						rejeicao: t.rejeicao,
					})),
				},
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

	// If filtering by telefoneId, only return templates that have a record for that phone
	if (input.whatsappConnectionPhoneId) {
		conditions.push(
			inArray(
				whatsappTemplates.id,
				db
					.select({
						templateId: whatsappTemplatePhones.templateId,
					})
					.from(whatsappTemplatePhones)
					.where(and(eq(whatsappTemplatePhones.telefoneId, input.whatsappConnectionPhoneId))),
			),
		);
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedWhatsappTemplatesResult = await db
		.select({ count: count() })
		.from(whatsappTemplates)
		.where(and(...conditions, or(eq(whatsappTemplates.organizacaoId, userOrgId), isNull(whatsappTemplates.organizacaoId))));
	const matchedWhatsappTemplatesCount = matchedWhatsappTemplatesResult[0]?.count ?? 0;

	const totalPages = Math.ceil(matchedWhatsappTemplatesCount / PAGE_SIZE);

	const whatsappTemplatesResult = await db.query.whatsappTemplates.findMany({
		where: and(...conditions, or(eq(whatsappTemplates.organizacaoId, userOrgId), isNull(whatsappTemplates.organizacaoId))),
		columns: {
			id: true,
			nome: true,
			categoria: true,
			dataInsercao: true,
		},
		with: {
			autor: {
				columns: {
					id: true,
					nome: true,
					avatarUrl: true,
				},
			},
			telefones: {
				columns: {
					id: true,
					status: true,
					qualidade: true,
				},
			},
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
		offset: skip,
		limit: PAGE_SIZE,
	});

	// Compute overall status and quality for each template
	const templatesWithComputedStatus = whatsappTemplatesResult.map((template) => {
		const phoneStatuses = template.telefones.map((t) => t.status);
		const phoneQualities = template.telefones.map((t) => t.qualidade);
		const statusGeral = phoneStatuses.length > 0 ? computeWorstStatus(phoneStatuses) : "PENDENTE";
		const qualidadeGeral = phoneQualities.length > 0 ? computeWorstQuality(phoneQualities) : "PENDENTE";
		const totalPhones = template.telefones.length;
		const approvedPhones = template.telefones.filter((t) => t.status === "APROVADO").length;

		return {
			id: template.id,
			nome: template.nome,
			categoria: template.categoria,
			dataInsercao: template.dataInsercao,
			autor: template.autor,
			statusGeral,
			qualidadeGeral,
			telefonesTotal: totalPhones,
			telefonesAprovados: approvedPhones,
		};
	});

	return {
		data: {
			default: {
				whatsappTemplates: templatesWithComputedStatus,
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
		whatsappConnectionPhoneId: searchParams.get("whatsappConnectionPhoneId") ?? undefined,
	});
	const result = await getWhatsappTemplates({ input, session });
	return NextResponse.json(result, { status: 200 });
}
export const GET = appApiHandler({
	GET: getWhatsappTemplatesRoute,
});

const UpdateWhatsappTemplateInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do template." }),
	template: WhatsappTemplateSchema.omit({ autorId: true, dataInsercao: true }),
});
export type TUpdateWhatsappTemplateInput = z.infer<typeof UpdateWhatsappTemplateInputSchema>;
