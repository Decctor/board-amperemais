import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
import { db } from "@/services/drizzle";
import { chatServices, chats } from "@/services/drizzle/schema/chats";
import { clients } from "@/services/drizzle/schema/clients";
import { users } from "@/services/drizzle/schema/users";
import { and, eq, or, sql } from "drizzle-orm";

type TransferServiceToHumanParams = {
	chatId: string;
	clientId: string;
	reason: string;
	conversationSummary: string;
};

export async function transferServiceToHuman({
	chatId,
	clientId,
	reason,
	conversationSummary,
}: TransferServiceToHumanParams): Promise<{ success: true; serviceId?: string; updated?: boolean }> {
	console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Transferring service to human for chat:", chatId, "Reason:", reason);

	// Get chat with WhatsApp connection info
	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, chatId),
		columns: {
			id: true,
			organizacaoId: true,
		},
		with: {
			whatsappConexao: {
				columns: {
					id: true,
					token: true,
				},
			},
			whatsappConexaoTelefone: {
				columns: {
					id: true,
					whatsappTelefoneId: true,
				},
			},
		},
	});

	if (!chat) {
		throw new Error("Chat não encontrado.");
	}

	if (!chat.whatsappConexao) {
		throw new Error("WhatsApp connection não encontrado.");
	}

	const whatsappToken = chat.whatsappConexao.token;
	if (!whatsappToken) {
		throw new Error("WhatsApp token não encontrado.");
	}

	// Check if there's already an open service for this chat
	const existingService = await db.query.chatServices.findFirst({
		where: and(eq(chatServices.chatId, chatId), or(eq(chatServices.status, "PENDENTE"), eq(chatServices.status, "EM_ANDAMENTO"))),
	});

	if (existingService) {
		// Get all users from the same organization
		const allUsers = await db.query.users.findMany({
			where: and(eq(users.organizacaoId, chat.organizacaoId), sql`${users.permissoes}->'atendimentos'->>'receberTransferencias' = 'true'`),
			columns: {
				id: true,
				nome: true,
				telefone: true,
			},
		});

		if (allUsers.length === 0) {
			throw new Error("Nenhum usuário encontrado na organização.");
		}

		// Select random user
		const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
		console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Selected user:", {
			nome: randomUser.nome,
			telefone: randomUser.telefone,
		});

		if (!randomUser) {
			throw new Error("Nenhum usuário apto a receber transferências de atendimentos encontrado.");
		}
		// Update existing service to add context and assign to user
		const updatedDescription = `${existingService.descricao}\n\n[TRANSFERÊNCIA AI]\nMotivo: ${reason}\nResumo: ${conversationSummary}`;

		await db
			.update(chatServices)
			.set({
				descricao: updatedDescription,
				responsavelTipo: "USUÁRIO",
				responsavelUsuarioId: randomUser.id,
			})
			.where(eq(chatServices.id, existingService.id));

		// Send WhatsApp notification if user has phone
		if (randomUser.telefone && chat.whatsappConexaoTelefone && chat.whatsappConexaoTelefone.whatsappTelefoneId) {
			// Get client info
			const client = await db.query.clients.findFirst({
				where: eq(clients.id, existingService.clienteId),
				columns: {
					nome: true,
					telefone: true,
				},
			});

			if (client) {
				console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Scheduling WhatsApp notification to user:", randomUser.telefone);
				try {
					const notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
						templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
						clientName: client.nome,
						clientePhoneNumber: client.telefone,
						toPhoneNumber: randomUser.telefone,
						serviceDescription: updatedDescription,
					}).data;

					// Send notification asynchronously (fire and forget)
					sendTemplateWhatsappMessage({
						whatsappToken,
						fromPhoneNumberId: chat.whatsappConexaoTelefone.whatsappTelefoneId,
						templatePayload: notificationPayload,
					}).catch((error) => {
						console.error("[ERROR] [SERVICES] [TRANSFER_TO_HUMAN] Failed to send WhatsApp notification:", error);
					});
				} catch (error) {
					console.error("[ERROR] [SERVICES] [TRANSFER_TO_HUMAN] Error preparing WhatsApp notification:", error);
				}
			}
		}

		console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Updated existing service:", existingService.id);

		return {
			success: true,
			serviceId: existingService.id,
			updated: true,
		};
	}

	// Verify client exists
	const client = await db.query.clients.findFirst({
		where: eq(clients.id, clientId),
	});

	if (!client) {
		throw new Error("Cliente não encontrado.");
	}

	// Get all users from the same organization
	const allUsers = await db.query.users.findMany({
		where: and(eq(users.organizacaoId, chat.organizacaoId), sql`${users.permissoes}->'atendimentos'->>'receberTransferencias' = 'true'`),
		columns: {
			id: true,
			nome: true,
			telefone: true,
		},
	});

	if (allUsers.length === 0) {
		throw new Error("Nenhum usuário encontrado na organização.");
	}

	// Select random user
	const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];

	// Create new service for human
	const [newService] = await db
		.insert(chatServices)
		.values({
			organizacaoId: chat.organizacaoId,
			chatId: chatId,
			clienteId: clientId,
			descricao: `[TRANSFERÊNCIA AI]\nMotivo: ${reason}\n\nResumo da Conversa:\n${conversationSummary}`,
			status: "PENDENTE",
			responsavelTipo: "USUÁRIO",
			responsavelUsuarioId: randomUser.id,
		})
		.returning({ id: chatServices.id });

	console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Created new service:", newService.id);

	// Send WhatsApp notification if user has phone
	if (randomUser.telefone && chat.whatsappConexaoTelefone && chat.whatsappConexaoTelefone.whatsappTelefoneId) {
		const userWithPhone = await db.query.users.findFirst({
			where: eq(users.id, randomUser.id),
			columns: {
				telefone: true,
				nome: true,
			},
		});

		if (userWithPhone?.telefone) {
			console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Scheduling WhatsApp notification to user:", userWithPhone.telefone);
			try {
				const notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
					templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
					clientName: client.nome,
					clientePhoneNumber: client.telefone,
					toPhoneNumber: userWithPhone.telefone,
					serviceDescription: `[TRANSFERÊNCIA AI]\nMotivo: ${reason}\n\nResumo da Conversa:\n${conversationSummary}`,
				}).data;

				// Send notification asynchronously (fire and forget)
				sendTemplateWhatsappMessage({
					whatsappToken,
					fromPhoneNumberId: chat.whatsappConexaoTelefone.whatsappTelefoneId,
					templatePayload: notificationPayload,
				}).catch((error) => {
					console.error("[ERROR] [SERVICES] [TRANSFER_TO_HUMAN] Failed to send WhatsApp notification:", error);
				});
			} catch (error) {
				console.error("[ERROR] [SERVICES] [TRANSFER_TO_HUMAN] Error preparing WhatsApp notification:", error);
			}
		}
	}

	return {
		success: true,
		serviceId: newService.id,
		updated: false,
	};
}
