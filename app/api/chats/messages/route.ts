import type { TAuthUserSession } from "@/lib/authentication/types";
import { ChatMessageSchema } from "@/schemas/chats";
import { db } from "@/services/drizzle";
import { chatMessages, chatServices, chats } from "@/services/drizzle/schema";
import { supabaseClient } from "@/services/supabase";
import { th } from "date-fns/locale";
import { eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

const CreateMessageAppNaturalInputSchema = z.object({
	type: z.enum(["APP-NATURAL"]),
	message: ChatMessageSchema.omit({ organizacaoId: true, servicoId: true, whatsappTemplateId: true }),
});

const CreateMessageAppTemplateInputSchema = z.object({
	type: z.enum(["APP-TEMPLATE"]),
	message: ChatMessageSchema.omit({ organizacaoId: true }).pick({
		chatId: true,
		whatsappMessageId: true,
	}),
});

const CreateMessageInputSchema = z.discriminatedUnion("type", [CreateMessageAppNaturalInputSchema, CreateMessageAppTemplateInputSchema]);
export type TCreateMessageInputSchema = z.infer<typeof CreateMessageInputSchema>;

async function createMessage({ input, session }: { input: TCreateMessageInputSchema; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const chat = await db.query.chats.findFirst({
		where: (fields, { eq, and }) => and(eq(fields.organizacaoId, userOrgId), eq(fields.id, input.message.chatId)),
		with: {
			whatsappConexao: {
				columns: {
					token: true,
				},
			},
		},
	});
	if (!chat) throw new createHttpError.NotFound("Chat não encontrado.");

	const service = await db.query.chatServices.findFirst({
		where: (fields, { eq, and, or }) =>
			and(
				eq(fields.organizacaoId, userOrgId),
				eq(fields.chatId, input.message.chatId),
				or(eq(fields.status, "PENDENTE"), eq(fields.status, "EM_ANDAMENTO")),
			),
	});

	let serviceId: string | null = service?.id ?? null;
	if (!service) {
		// If no service is found, we need to create a new service
		const newService = await db
			.insert(chatServices)
			.values({
				organizacaoId: userOrgId,
				chatId: input.message.chatId,
				clienteId: chat.clienteId,
				responsavelTipo: "USUÁRIO",
				responsavelUsuarioId: session.id,
				descricao: "NÃO ESPECIFICADO",
				status: "PENDENTE",
			})
			.returning({ id: chatServices.id });

		const newServiceId = newService[0]?.id;
		if (!newServiceId) throw new createHttpError.InternalServerError("Erro ao criar serviço.");
		serviceId = newServiceId;
	} else {
		serviceId = service.id;
	}

	if (input.type === "APP-NATURAL") {
		const insertMessageResponse = await db
			.insert(chatMessages)
			.values({
				organizacaoId: userOrgId,
				chatId: input.message.chatId,
				autorTipo: "USUÁRIO",
				autorUsuarioId: session.id,
				conteudoTexto: input.message.conteudoTexto,
				conteudoMidiaUrl: input.message.conteudoMidiaUrl,
				conteudoMidiaTipo: input.message.conteudoMidiaTipo,
			})
			.returning({
				id: chatMessages.id,
			});

		const insertedMessageId = insertMessageResponse[0]?.id;
		if (!insertedMessageId) throw new createHttpError.InternalServerError("Erro ao criar mensagem.");

		const chatChanges = {
			ultimaMensagemId: insertedMessageId,
			ultimaMensagemData: new Date(),
			ultimaMensagemConteudoTexto: input.message.conteudoTexto,
			ultimaMensagemConteudoTipo: input.message.conteudoMidiaTipo,
		};
		if (input.message.autorTipo === "CLIENTE") {
			await db
				.update(chats)
				.set({
					...chatChanges,
					mensagensNaoLidas: chat.mensagensNaoLidas + 1,
					ultimaInteracaoClienteData: new Date(),
					status: "ABERTA",
				})
				.where(eq(chats.id, input.message.chatId));
		} else {
			await db
				.update(chats)
				.set({
					...chatChanges,
				})
				.where(eq(chats.id, input.message.chatId));
		}

		if (input.message.conteudoMidiaTipo !== "TEXTO") {
			if (!input.message.conteudoMidiaStorageId) throw new createHttpError.InternalServerError("Arquivo não encontrado.");
			const file = await supabaseClient.storage.from("files").download(input.message.conteudoMidiaStorageId);
			if (!file.data) throw new createHttpError.InternalServerError("Arquivo não encontrado.");
			const fileBuffer = await file.data.arrayBuffer();
			const fileBlob = new Blob([fileBuffer], { type: input.message.conteudoMidiaMimeType as string });
			const fileUrl = URL.createObjectURL(fileBlob);
		}
	}
}
