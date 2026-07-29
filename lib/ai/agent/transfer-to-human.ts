import { transferChatAttendance, updateChatAttendanceSummary } from "@/lib/chats/attendance-state";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
import type { DB, DBTransaction } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema/chats";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { users } from "@/services/drizzle/schema/users";
import { and, eq, sql } from "drizzle-orm";

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
			whatsappConexao: { columns: { token: true } },
			whatsappConexaoTelefone: { columns: { whatsappTelefoneId: true } },
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
	const whatsappToken = chat.whatsappConexao?.token;
	const fromPhoneNumberId = chat.whatsappConexaoTelefone?.whatsappTelefoneId;
	if (target.telefone && whatsappToken && fromPhoneNumberId && chat.cliente) {
		try {
			const notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
				templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
				clientName: chat.cliente.nome,
				clientePhoneNumber: chat.cliente.telefone,
				toPhoneNumber: target.telefone,
				serviceDescription: summary,
			}).data;

			sendTemplateWhatsappMessage({ whatsappToken, fromPhoneNumberId, templatePayload: notificationPayload }).catch((error) => {
				console.error("[ERROR] [AI_AGENT] [TRANSFER_TO_HUMAN] Falha ao notificar o usuário:", error);
			});
		} catch (error) {
			console.error("[ERROR] [AI_AGENT] [TRANSFER_TO_HUMAN] Erro ao preparar a notificação:", error);
		}
	}

	return { atendimentoId: attendance?.id, usuarioDestinoNome: target.nome };
}
