import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { MessageTemplateContentSchema, MessageTemplateMetadataSchema, MessageTemplateSchema } from "@/schemas/message-templates";
import { db } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema";
import { and, count, eq, sql, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import {
	applyWhatsappSubmissionResultToMetadata,
	assertWhatsappValidation,
	createEmptyMessageTemplateMetadata,
	deleteMessageTemplateFromMetaPhones,
	getOrganizationWhatsappPhones,
	normalizeContentForStorage,
	submitMessageTemplateToWhatsappPhone,
	withComputedMessageTemplateStatus,
} from "./_lib";
import { createSimplifiedSearchCondition } from "@/lib/search";

const CreateMessageTemplateInputSchema = z.object({
	messageTemplate: MessageTemplateSchema.omit({ autorId: true, dataInsercao: true }),
	submitWhatsapp: z.boolean().optional().default(true),
});
export type TCreateMessageTemplateInput = z.infer<typeof CreateMessageTemplateInputSchema>;

async function createMessageTemplate({ input, session }: { input: TCreateMessageTemplateInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const content = normalizeContentForStorage(input.messageTemplate.conteudo);
	assertWhatsappValidation(content);

	const [insertedTemplate] = await db
		.insert(messageTemplates)
		.values({
			...input.messageTemplate,
			organizacaoId: organizationId,
			nome: input.messageTemplate.nome,
			status: input.messageTemplate.status,
			alerta: input.messageTemplate.alerta,
			metadados: input.messageTemplate.metadados ?? createEmptyMessageTemplateMetadata(),
			conteudo: content,
			linguagem: input.messageTemplate.linguagem,
			categoria: input.messageTemplate.categoria,
			autorId: session.user.id,
		})
		.returning();

	if (!input.submitWhatsapp) {
		return {
			data: { insertedId: insertedTemplate.id, phoneResults: null },
			message: "Template criado com sucesso.",
		};
	}

	const phones = await getOrganizationWhatsappPhones(organizationId);
	if (phones.length === 0) throw new createHttpError.NotFound("Nenhum telefone cadastrado na conexão WhatsApp.");

	let nextMetadata = insertedTemplate.metadados;
	let nextContent = insertedTemplate.conteudo;
	const phoneResults = [];

	for (const phone of phones) {
		try {
			const result = await submitMessageTemplateToWhatsappPhone({
				template: { ...insertedTemplate, metadados: nextMetadata, conteudo: nextContent },
				phone,
				organizationId,
				mode: "create",
			});
			nextMetadata = applyWhatsappSubmissionResultToMetadata({
				metadata: nextMetadata,
				phoneId: phone.id,
				idExterno: result.idExterno,
			});
			if (result.content) nextContent = result.content;
			phoneResults.push(result);
		} catch (error) {
			phoneResults.push({ phoneId: phone.id, success: false, idExterno: null, message: error instanceof Error ? error.message : "Erro desconhecido" });
		}
	}

	await db
		.update(messageTemplates)
		.set({
			metadados: nextMetadata,
			conteudo: nextContent,
			dataAtualizacao: new Date(),
		})
		.where(eq(messageTemplates.id, insertedTemplate.id));

	const successful = phoneResults.filter((result) => result.success).length;
	const failed = phoneResults.length - successful;
	if (successful === 0 && failed > 0) throw new createHttpError.BadRequest(phoneResults[0]?.message || "Erro ao criar template na Meta.");

	return {
		data: {
			insertedId: insertedTemplate.id,
			phoneResults: { successful, failed, details: phoneResults },
		},
		message: failed > 0 ? `Template criado com ${successful} telefone(s) e ${failed} falha(s).` : "Template criado com sucesso em todos os telefones.",
	};
}
export type TCreateMessageTemplateOutput = Awaited<ReturnType<typeof createMessageTemplate>>;

async function createMessageTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CreateMessageTemplateInputSchema.parse(payload);
	const result = await createMessageTemplate({ input, session });
	return NextResponse.json(result, { status: 201 });
}

const UpdateMessageTemplateInputSchema = z.object({
	messageTemplateId: z.string({ required_error: "ID do template não informado." }),
	messageTemplate: MessageTemplateSchema.omit({ autorId: true, dataInsercao: true }).partial(),
	submitWhatsapp: z.boolean().optional().default(true),
});
export type TUpdateMessageTemplateInput = z.infer<typeof UpdateMessageTemplateInputSchema>;

async function updateMessageTemplate({ input, session }: { input: TUpdateMessageTemplateInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const existingTemplate = await db.query.messageTemplates.findFirst({
		where: and(eq(messageTemplates.id, input.messageTemplateId), eq(messageTemplates.organizacaoId, organizationId)),
	});
	if (!existingTemplate) throw new createHttpError.NotFound("Template não encontrado.");

	const content = input.messageTemplate.conteudo ? normalizeContentForStorage(input.messageTemplate.conteudo) : existingTemplate.conteudo;
	assertWhatsappValidation(content);

	const updateSet = {
		nome: input.messageTemplate.nome ?? existingTemplate.nome,
		status: input.messageTemplate.status ?? existingTemplate.status,
		alerta: input.messageTemplate.alerta === undefined ? existingTemplate.alerta : input.messageTemplate.alerta,
		conteudo: content,
		metadados: input.messageTemplate.metadados ?? existingTemplate.metadados,
		linguagem: input.messageTemplate.linguagem ?? existingTemplate.linguagem,
		categoria: input.messageTemplate.categoria ?? existingTemplate.categoria,
		dataAtualizacao: new Date(),
	};
	const updatedLocal = { ...existingTemplate, ...updateSet };

	await db.update(messageTemplates).set(updateSet).where(eq(messageTemplates.id, existingTemplate.id));

	if (!input.submitWhatsapp || (!input.messageTemplate.conteudo && !input.messageTemplate.categoria)) {
		return {
			data: { updatedId: existingTemplate.id, phoneResults: null },
			message: "Template atualizado com sucesso.",
		};
	}

	const phones = await getOrganizationWhatsappPhones(organizationId);
	let nextMetadata = updatedLocal.metadados;
	let nextContent = updatedLocal.conteudo;
	const phoneResults = [];

	for (const phone of phones) {
		try {
			const result = await submitMessageTemplateToWhatsappPhone({
				template: { ...updatedLocal, metadados: nextMetadata, conteudo: nextContent },
				phone,
				organizationId,
				mode: "upsert",
			});
			nextMetadata = applyWhatsappSubmissionResultToMetadata({ metadata: nextMetadata, phoneId: phone.id, idExterno: result.idExterno });
			if (result.content) nextContent = result.content;
			phoneResults.push(result);
		} catch (error) {
			phoneResults.push({ phoneId: phone.id, success: false, idExterno: null, message: error instanceof Error ? error.message : "Erro desconhecido" });
		}
	}

	await db
		.update(messageTemplates)
		.set({ metadados: nextMetadata, conteudo: nextContent, dataAtualizacao: new Date() })
		.where(eq(messageTemplates.id, existingTemplate.id));

	const successful = phoneResults.filter((result) => result.success).length;
	const failed = phoneResults.length - successful;
	if (successful === 0 && failed > 0) throw new createHttpError.BadRequest(phoneResults[0]?.message || "Erro ao atualizar template na Meta.");

	return {
		data: { updatedId: existingTemplate.id, phoneResults: { successful, failed, details: phoneResults } },
		message:
			failed > 0 ? `Template atualizado com ${successful} telefone(s) e ${failed} falha(s).` : "Template atualizado com sucesso em todos os telefones.",
	};
}
export type TUpdateMessageTemplateOutput = Awaited<ReturnType<typeof updateMessageTemplate>>;

async function updateMessageTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = UpdateMessageTemplateInputSchema.parse(await request.json());
	const result = await updateMessageTemplate({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const DeleteMessageTemplateInputSchema = z.object({
	id: z.string({ required_error: "ID do template não informado." }),
	deleteFromMeta: z
		.string()
		.optional()
		.nullable()
		.transform((value) => value !== "false"),
});
export type TDeleteMessageTemplateInput = z.infer<typeof DeleteMessageTemplateInputSchema>;

async function deleteMessageTemplate({ input, session }: { input: TDeleteMessageTemplateInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const template = await db.query.messageTemplates.findFirst({
		where: and(eq(messageTemplates.id, input.id), eq(messageTemplates.organizacaoId, organizationId)),
	});
	if (!template) throw new createHttpError.NotFound("Template não encontrado.");

	const phones = input.deleteFromMeta ? await getOrganizationWhatsappPhones(organizationId) : [];
	const metaResults = input.deleteFromMeta ? await deleteMessageTemplateFromMetaPhones({ template, phones }) : [];
	await db.delete(messageTemplates).where(eq(messageTemplates.id, template.id));

	return {
		data: { deleted: true as const, metaResults },
		message: "Template excluído com sucesso.",
	};
}
export type TDeleteMessageTemplateOutput = Awaited<ReturnType<typeof deleteMessageTemplate>>;

async function deleteMessageTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = DeleteMessageTemplateInputSchema.parse({
		id: request.nextUrl.searchParams.get("id") ?? undefined,
		deleteFromMeta: request.nextUrl.searchParams.get("deleteFromMeta") ?? undefined,
	});
	const result = await deleteMessageTemplate({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const GetMessageTemplatesInputSchema = z.object({
	id: z
		.string({
			invalid_type_error: "Tipo inválido para ID do template.",
		})
		.optional()
		.nullable(),
	page: z
		.string()
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 1)),
	search: z
		.string({
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
});
export type TGetMessageTemplatesInput = z.infer<typeof GetMessageTemplatesInputSchema>;

async function getMessageTemplates({ input, session }: { input: TGetMessageTemplatesInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (input.id) {
		const template = await db.query.messageTemplates.findFirst({
			where: and(eq(messageTemplates.id, input.id), eq(messageTemplates.organizacaoId, organizationId)),
			with: { autor: { columns: { id: true, nome: true, avatarUrl: true } } },
		});
		if (!template) throw new createHttpError.NotFound("Template não encontrado.");
		return { data: { byId: withComputedMessageTemplateStatus(template), default: null }, message: "Template encontrado com sucesso." };
	}

	const PAGE_SIZE = 25;
	const page = input.page || 1;
	const conditions: SQL[] = [eq(messageTemplates.organizacaoId, organizationId)];
	if (input.search?.trim()) {
		conditions.push(createSimplifiedSearchCondition(messageTemplates.nome, input.search));
	}

	const templatesMatchedResult = await db
		.select({ count: count() })
		.from(messageTemplates)
		.where(and(...conditions));

	const templatesMatchedCount = templatesMatchedResult[0].count as number;

	const templates = await db.query.messageTemplates.findMany({
		where: and(...conditions),
		with: { autor: { columns: { id: true, nome: true, avatarUrl: true } } },
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
		offset: PAGE_SIZE * (page - 1),
		limit: PAGE_SIZE,
	});

	return {
		data: {
			byId: null,
			default: {
				messageTemplates: templates.map(withComputedMessageTemplateStatus),
				messageTemplatesMatched: templatesMatchedCount,
				totalPages: Math.ceil(templatesMatchedCount / PAGE_SIZE),
			},
		},
		message: "Templates encontrados com sucesso.",
	};
}
export type TGetMessageTemplatesOutput = Awaited<ReturnType<typeof getMessageTemplates>>;
export type TGetMessageTemplatesOutputDefault = Exclude<TGetMessageTemplatesOutput["data"]["default"], null>;
export type TGetMessageTemplatesOutputById = Exclude<TGetMessageTemplatesOutput["data"]["byId"], null>;

async function getMessageTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetMessageTemplatesInputSchema.parse({
		id: request.nextUrl.searchParams.get("id") ?? undefined,
		search: request.nextUrl.searchParams.get("search") ?? undefined,
		page: request.nextUrl.searchParams.get("page") ?? undefined,
	});
	const result = await getMessageTemplates({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getMessageTemplatesRoute });
export const POST = appApiHandler({ POST: createMessageTemplateRoute });
export const PUT = appApiHandler({ PUT: updateMessageTemplateRoute });
export const DELETE = appApiHandler({ DELETE: deleteMessageTemplateRoute });
