import { transferChatAttendance, updateChatAttendanceSummary } from "@/lib/chats/attendance-state";
import { sendTemplateWhatsappMessage, uploadMediaToWhatsapp } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
import type { DB, DBTransaction } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema/chats";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { users } from "@/services/drizzle/schema/users";
import { and, eq, sql } from "drizzle-orm";
import { renderHandoffHeaderPng } from "./handoff-notification/render";

const SERVICE_TRANSFER_TEMPLATE_V2 = "service_transfer_notification_v2";

/**
 * Handoff da IA para um humano.
 *
 * Transfere o atendimento ativo pela camada canônica (`transferChatAttendance`) e notifica o
 * destinatário por template do WhatsApp. O motivo entra prefixado com `HUMAN_HANDOFF:`, que é
 * como o hub identifica um episódio encerrado pela IA.
 *
 * `organizacaoId` agora vem do chamador (contexto da execução) e entra no WHERE da busca do
 * chat — antes a função derivava a organização do próprio chat, sem verificar o tenant.
 */
export async function transferChatToHuman({
	db,
	organizacaoId,
	chatId,
	motivo,
	resumoConversa,
}: {
	db: DB | DBTransaction;
	organizacaoId: string;
	chatId: string;
	motivo: string;
	resumoConversa: string;
}): Promise<{ atendimentoId?: string; usuarioDestinoNome: string }> {
	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, chatId), eq(chats.organizacaoId, organizacaoId)),
		columns: { id: true, organizacaoId: true },
		with: {
			cliente: { columns: { nome: true, telefone: true } },
			organizacao: { columns: { nome: true, logoUrl: true } },
		},
	});

	if (!chat) throw new Error("Chat não encontrado.");

	// Candidatos: membros da organização com permissão de receber transferências.
	const candidates = await db
		.select({ id: users.id, nome: users.nome, telefone: users.telefone })
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.usuarioId))
		.where(
			and(
				eq(organizationMembers.organizacaoId, organizacaoId),
				sql`${organizationMembers.permissoes}->'atendimentos'->>'receberTransferencias' = 'true'`,
			),
		);

	if (candidates.length === 0) throw new Error("Nenhum usuário apto a receber transferências de atendimentos encontrado.");

	const target = candidates[Math.floor(Math.random() * candidates.length)];
	const summary = `[TRANSFERÊNCIA IA]\nMotivo: ${motivo}\n\nResumo da conversa:\n${resumoConversa}`;

	await updateChatAttendanceSummary(db, { organizacaoId, chatId, resumo: summary });
	const attendance = await transferChatAttendance(db, {
		organizacaoId,
		chatId,
		usuarioDestinoId: target.id,
		motivo: `HUMAN_HANDOFF: ${motivo}`,
	});

	// Notificação é acessória: uma falha aqui não desfaz a transferência.
	const whatsappToken = process.env.META_ACCESS_TOKEN;
	const fromPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
	if (target.telefone && whatsappToken && fromPhoneNumberId && chat.cliente && chat.organizacao) {
		try {
			const useImageTemplate = process.env.META_SERVICE_TRANSFER_TEMPLATE_NAME === SERVICE_TRANSFER_TEMPLATE_V2;
			let notificationPayload;
			if (useImageTemplate) {
				const headerPng = await renderHandoffHeaderPng({
					organizationName: chat.organizacao.nome,
					organizationLogoUrl: chat.organizacao.logoUrl,
					clientName: chat.cliente.nome,
					clientPhone: chat.cliente.telefone,
					reason: motivo,
				});
				const { mediaId } = await uploadMediaToWhatsapp({
					fromPhoneNumberId,
					fileBuffer: headerPng,
					mimeType: "image/png",
					filename: `transferencia-${chat.id}.png`,
					whatsappToken,
				});
				notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS_V2.getPayload({
					templateKey: "SERVICE_TRANSFER_NOTIFICATIONS_V2",
					headerMediaId: mediaId,
					organizationName: chat.organizacao.nome,
					clientName: chat.cliente.nome,
					clientePhoneNumber: chat.cliente.telefone,
					toPhoneNumber: target.telefone,
					serviceDescription: summary,
				}).data;
			} else {
				notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
					templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
					organizationName: chat.organizacao.nome,
					clientName: chat.cliente.nome,
					clientePhoneNumber: chat.cliente.telefone,
					toPhoneNumber: target.telefone,
					serviceDescription: summary,
				}).data;
			}

			await sendTemplateWhatsappMessage({ whatsappToken, fromPhoneNumberId, templatePayload: notificationPayload });
		} catch (error) {
			console.error("[ERROR] [AI_AGENT] [TRANSFER_TO_HUMAN] Falha ao notificar o usuário:", error);
		}
	}

	return { atendimentoId: attendance?.id, usuarioDestinoNome: target.nome };
}
