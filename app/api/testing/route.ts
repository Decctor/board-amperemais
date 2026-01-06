import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { db } from "@/services/drizzle";
import {
	type TChatMessageEntity,
	type TNewChatEntity,
	type TNewChatMessageEntity,
	type TNewChatServiceEntity,
	chatMessages,
	chatServices,
	chats,
} from "@/services/drizzle/schema";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL as string;

export async function GET(request: Request) {
	return NextResponse.json("OK");
	// try {
	// 	const convex = new ConvexHttpClient(CONVEX_URL);
	// 	const migrationData = await convex.query(api.queries.utils.getMigrationData);
	// 	const clientsMap = new Map(migrationData.clients.map((client) => [client._id, client]));
	// 	const usersMap = new Map(migrationData.users.map((user) => [user._id, user]));
	// 	const chatRelation = new Map<string, string>();
	// 	const chatServiceRelation = new Map<string, string>();
	// 	await db.transaction(async (tx) => {
	// 		const whatsappConnection = await tx.query.whatsappConnections.findFirst({
	// 			where: (fields, { eq }) => eq(fields.organizacaoId, "4a4e8578-63f0-4119-9695-a2cc068de8d6"),
	// 			with: {
	// 				telefones: true,
	// 			},
	// 		});
	// 		if (!whatsappConnection) {
	// 			throw new Error("Whatsapp connection not found");
	// 		}
	// 		for (const [chatIndex, chat] of migrationData.chats.entries()) {
	// 			console.log(`Processing chat ${chatIndex + 1} of ${migrationData.chats.length}`);
	// 			const equivalent = clientsMap.get(chat.clienteId);
	// 			if (!equivalent) continue;
	// 			const equivalentWhatsappConnectionPhone = whatsappConnection.telefones.find((phone) => phone.whatsappTelefoneId === chat.whatsappTelefoneId);
	// 			if (!equivalentWhatsappConnectionPhone) {
	// 				console.log(`Whatsapp connection phone not found for chat ${chat._id}`);
	// 				continue;
	// 			}
	// 			console.log(`Inserting chat ${chat._id}`);
	// 			const chatToInsert: TNewChatEntity = {
	// 				organizacaoId: "4a4e8578-63f0-4119-9695-a2cc068de8d6",
	// 				clienteId: equivalent.idApp,
	// 				whatsappTelefoneId: chat.whatsappTelefoneId,
	// 				mensagensNaoLidas: chat.mensagensNaoLidas,
	// 				status: chat.status === "ABERTA" ? "ABERTA" : "FECHADA",
	// 				ultimaMensagemData: chat.ultimaMensagemData ? new Date(chat.ultimaMensagemData) : new Date(),
	// 				ultimaMensagemConteudoTipo: chat.ultimaMensagemConteudoTipo || "TEXTO",
	// 				ultimaMensagemConteudoTexto: chat.ultimaMensagemConteudoTexto,
	// 				whatsappConexaoId: whatsappConnection.id,
	// 				whatsappConexaoTelefoneId: equivalentWhatsappConnectionPhone.id,
	// 			};
	// 			const insertedChat = await tx.insert(chats).values(chatToInsert).returning({ id: chats.id });
	// 			const insertedChatId = insertedChat[0].id;
	// 			console.log(`New chat inserted with id ${insertedChatId} for chat ${chat._id}`);
	// 			if (!insertedChatId) throw new Error("Chat not inserted");
	// 			chatRelation.set(chat._id, insertedChatId);
	// 			console.log(`Handling services for chat ${chat._id}`);
	// 			const services = migrationData.services.filter((service) => service.chatId === chat._id);
	// 			for (const service of services) {
	// 				const equivalent = clientsMap.get(service.clienteId);
	// 				if (!equivalent) continue;
	// 				const serviceToInsert: TNewChatServiceEntity = {
	// 					organizacaoId: "4a4e8578-63f0-4119-9695-a2cc068de8d6",
	// 					chatId: insertedChatId,
	// 					clienteId: equivalent.idApp,
	// 					descricao: service.descricao,
	// 					status: service.status,
	// 					responsavelTipo:
	// 						service.responsavel === "ai" ? "AI" : service.responsavel === "phone" ? "BUSINESS-APP" : service.responsavel ? "USUÁRIO" : undefined,
	// 					responsavelUsuarioId:
	// 						service.responsavel && service.responsavel !== "ai" && service.responsavel !== "phone"
	// 							? usersMap.get(service.responsavel as Id<"users">)?.idApp
	// 							: undefined,
	// 					dataInicio: new Date(service.dataInicio),
	// 					dataFim: service.dataFim ? new Date(service.dataFim) : null,
	// 				};
	// 				const insertedService = await tx.insert(chatServices).values(serviceToInsert).returning({ id: chatServices.id });
	// 				const insertedServiceId = insertedService[0].id;
	// 				if (!insertedServiceId) throw new Error("Service not inserted");
	// 				chatServiceRelation.set(service._id, insertedServiceId);
	// 			}
	// 			const chatMessagesFiltered = migrationData.messages.filter((message) => message.chatId === chat._id);
	// 			console.log("Inserting messages");
	// 			const messagesToInsert: TNewChatMessageEntity[] = chatMessagesFiltered.map((message) => ({
	// 				organizacaoId: "4a4e8578-63f0-4119-9695-a2cc068de8d6",
	// 				chatId: chatRelation.get(message.chatId) as string,
	// 				autorTipo: (message.autorTipo === "ai"
	// 					? "AI"
	// 					: message.autorTipo === "cliente"
	// 						? "CLIENTE"
	// 						: message.autorTipo === "usuario"
	// 							? "USUÁRIO"
	// 							: "BUSINESS-APP") as TChatMessageEntity["autorTipo"],
	// 				autorUsuarioId: message.autorTipo === "usuario" ? usersMap.get(message.autorId as Id<"users">)?.idApp : undefined,
	// 				autorClienteId: message.autorTipo === "cliente" ? clientsMap.get(message.autorId as Id<"clients">)?.idApp : undefined,
	// 				conteudoTexto: message.conteudoTexto || "",
	// 				conteudoMidiaTipo: message.conteudoMidiaTipo || ("TEXTO" as const),
	// 				conteudoMidiaUrl: message.conteudoMidiaUrl,
	// 				conteudoMidiaStorageId: message.conteudoMidiaStorageId,
	// 				conteudoMidiaMimeType: message.conteudoMidiaMimeType,
	// 				conteudoMidiaArquivoNome: message.conteudoMidiaFileName,
	// 				conteudoMidiaArquivoTamanho: message.conteudoMidiaFileSize,
	// 				conteudoMidiaTextoProcessado: message.conteudoMidiaTextoProcessado,
	// 				conteudoMidiaTextoProcessadoResumo: message.conteudoMidiaTextoProcessadoResumo,
	// 				conteudoMidiaWhatsappId: message.conteudoMidiaWhatsappId,
	// 				status: message.status,
	// 				whatsappMessageId: message.whatsappMessageId,
	// 				whatsappMessageStatus: message.whatsappStatus,
	// 				servicoId: message.servicoId ? chatServiceRelation.get(message.servicoId) || undefined : undefined,
	// 				dataEnvio: new Date(message.dataEnvio),
	// 				isEcho: message.isEcho,
	// 			}));
	// 			await tx.insert(chatMessages).values(messagesToInsert).returning({ id: chatMessages.id });
	// 			console.log("Messages inserted");
	// 			console.log(`Services handled for chat ${chat._id}`);
	// 		}
	// 	});
	// 	return NextResponse.json("OK");
	// } catch (error) {
	// 	console.error("Error inserting data", error);
	// 	return NextResponse.json({ error: error.message }, { status: 500 });
	// }
}
