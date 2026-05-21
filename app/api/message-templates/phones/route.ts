import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import {
	applyWhatsappSubmissionResultToMetadata,
	deleteMessageTemplateFromMetaPhones,
	getOrganizationWhatsappPhones,
	submitMessageTemplateToWhatsappPhone,
	syncMessageTemplateFromMetaForPhone,
} from "../_lib";

const MessageTemplatePhoneInputSchema = z.object({
	messageTemplateId: z.string({ required_error: "ID do template não informado." }),
	telefoneId: z.string({ required_error: "ID do telefone não informado." }),
});
const DeleteMessageTemplatePhoneInputSchema = MessageTemplatePhoneInputSchema.extend({
	deleteFromMeta: z
		.string()
		.optional()
		.nullable()
		.transform((value) => value !== "false"),
});

export type TCreateMessageTemplatePhoneInput = z.infer<typeof MessageTemplatePhoneInputSchema>;
export type TSyncMessageTemplatePhoneInput = z.infer<typeof MessageTemplatePhoneInputSchema>;
export type TDeleteMessageTemplatePhoneInput = z.infer<typeof DeleteMessageTemplatePhoneInputSchema>;

async function getTemplateAndPhone({ input, session }: { input: z.infer<typeof MessageTemplatePhoneInputSchema>; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const template = await db.query.messageTemplates.findFirst({
		where: and(eq(messageTemplates.id, input.messageTemplateId), eq(messageTemplates.organizacaoId, organizationId)),
	});
	if (!template) throw new createHttpError.NotFound("Template não encontrado.");

	const phones = await getOrganizationWhatsappPhones(organizationId);
	const phone = phones.find((item) => item.id === input.telefoneId);
	if (!phone) throw new createHttpError.NotFound("Telefone não encontrado.");

	return { organizationId, template, phone };
}

async function createMessageTemplatePhone({ input, session }: { input: TCreateMessageTemplatePhoneInput; session: TAuthUserSession }) {
	const { organizationId, template, phone } = await getTemplateAndPhone({ input, session });
	const result = await submitMessageTemplateToWhatsappPhone({
		template,
		phone,
		organizationId,
		mode: "create",
	});
	const nextMetadata = applyWhatsappSubmissionResultToMetadata({
		metadata: template.metadados,
		phoneId: phone.id,
		idExterno: result.idExterno,
	});
	await db
		.update(messageTemplates)
		.set({
			metadados: nextMetadata,
			conteudo: result.content ?? template.conteudo,
			dataAtualizacao: new Date(),
		})
		.where(eq(messageTemplates.id, template.id));

	return { data: result, message: "Template vinculado ao telefone com sucesso." };
}
export type TCreateMessageTemplatePhoneOutput = Awaited<ReturnType<typeof createMessageTemplatePhone>>;

async function createMessageTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = MessageTemplatePhoneInputSchema.parse(await request.json());
	const result = await createMessageTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 201 });
}

async function syncMessageTemplatePhone({ input, session }: { input: TSyncMessageTemplatePhoneInput; session: TAuthUserSession }) {
	const { template, phone } = await getTemplateAndPhone({ input, session });
	const patch = await syncMessageTemplateFromMetaForPhone({ template, phone });
	await db
		.update(messageTemplates)
		.set({
			nome: patch.nome,
			categoria: patch.categoria,
			linguagem: patch.linguagem,
			conteudo: patch.conteudo,
			metadados: patch.metadados,
			dataAtualizacao: new Date(),
		})
		.where(eq(messageTemplates.id, template.id));

	return { data: { synced: true as const, templateName: patch.nome }, message: "Template sincronizado com a Meta." };
}
export type TSyncMessageTemplatePhoneOutput = Awaited<ReturnType<typeof syncMessageTemplatePhone>>;

async function syncMessageTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = MessageTemplatePhoneInputSchema.parse(await request.json());
	const result = await syncMessageTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 200 });
}

async function deleteMessageTemplatePhone({ input, session }: { input: TDeleteMessageTemplatePhoneInput; session: TAuthUserSession }) {
	const { template, phone } = await getTemplateAndPhone({ input, session });
	const metaResults = input.deleteFromMeta ? await deleteMessageTemplateFromMetaPhones({ template, phones: [phone] }) : [];
	const { [phone.id]: _removed, ...remainingMetadata } = template.metadados.porNumeroTelefone;
	await db
		.update(messageTemplates)
		.set({
			metadados: {
				...template.metadados,
				porNumeroTelefone: remainingMetadata,
			},
			dataAtualizacao: new Date(),
		})
		.where(eq(messageTemplates.id, template.id));

	return { data: { deleted: true as const, metaResults }, message: "Vínculo do template com o telefone removido." };
}
export type TDeleteMessageTemplatePhoneOutput = Awaited<ReturnType<typeof deleteMessageTemplatePhone>>;

async function deleteMessageTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = DeleteMessageTemplatePhoneInputSchema.parse({
		messageTemplateId: request.nextUrl.searchParams.get("messageTemplateId") ?? undefined,
		telefoneId: request.nextUrl.searchParams.get("telefoneId") ?? undefined,
		deleteFromMeta: request.nextUrl.searchParams.get("deleteFromMeta") ?? undefined,
	});
	const result = await deleteMessageTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: createMessageTemplatePhoneRoute });
export const PUT = appApiHandler({ PUT: syncMessageTemplatePhoneRoute });
export const DELETE = appApiHandler({ DELETE: deleteMessageTemplatePhoneRoute });
