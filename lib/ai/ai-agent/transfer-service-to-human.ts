import { transferChatAttendance, updateChatAttendanceSummary } from "@/lib/chats/attendance-state";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { WHATSAPP_REPORT_TEMPLATES } from "@/lib/whatsapp/templates";
import { db } from "@/services/drizzle";
import { chats } from "@/services/drizzle/schema/chats";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { users } from "@/services/drizzle/schema/users";
import { and, eq, sql } from "drizzle-orm";

type TransferServiceToHumanParams = {
	chatId: string;
	reason: string;
	conversationSummary: string;
};

/**
 * Handoff da IA para um humano.
 *
 * Transfere o atendimento ativo pela camada canônica (`transferChatAttendance`) e notifica
 * o destinatário por template do WhatsApp. O motivo entra prefixado com `HUMAN_HANDOFF:`,
 * que é como o hub identifica um episódio encerrado pela IA.
 *
 * Duas correções sobre a versão anterior:
 * - a busca de destinatários lia `users.organizacaoId` e `users.permissoes`, colunas que
 *   **não existem** — a permissão vive em `organization_members.permissoes`, e a query
 *   nunca chegou a compilar;
 * - os dois ramos (serviço existente vs. novo) eram cópias um do outro; agora o
 *   atendimento ativo é garantido pela própria camada de estado.
 */
export async function transferServiceToHuman({
	chatId,
	reason,
	conversationSummary,
}: TransferServiceToHumanParams): Promise<{ success: true; atendimentoId?: string; usuarioDestinoId?: string }> {
	console.log("[INFO] [ATENDIMENTOS] [TRANSFER_TO_HUMAN] Transferindo atendimento do chat:", chatId, "Motivo:", reason);

	const chat = await db.query.chats.findFirst({
		where: eq(chats.id, chatId),
		columns: { id: true, organizacaoId: true },
		with: {
			cliente: { columns: { nome: true, telefone: true } },
			whatsappConexao: { columns: { token: true } },
			whatsappConexaoTelefone: { columns: { whatsappTelefoneId: true } },
		},
	});

	if (!chat) throw new Error("Chat não encontrado.");

	// Candidatos: membros ativos da organização com permissão de receber transferências.
	const candidates = await db
		.select({ id: users.id, nome: users.nome, telefone: users.telefone })
		.from(organizationMembers)
		.innerJoin(users, eq(users.id, organizationMembers.usuarioId))
		.where(
			and(
				eq(organizationMembers.organizacaoId, chat.organizacaoId),
				sql`${organizationMembers.permissoes}->'atendimentos'->>'receberTransferencias' = 'true'`,
			),
		);

	if (candidates.length === 0) throw new Error("Nenhum usuário apto a receber transferências de atendimentos encontrado.");

	const destino = candidates[Math.floor(Math.random() * candidates.length)];
	const motivo = `HUMAN_HANDOFF: ${reason}`;
	const resumo = `[TRANSFERÊNCIA IA]\nMotivo: ${reason}\n\nResumo da conversa:\n${conversationSummary}`;

	await updateChatAttendanceSummary(db, { organizacaoId: chat.organizacaoId, chatId, resumo });
	const atendimento = await transferChatAttendance(db, {
		organizacaoId: chat.organizacaoId,
		chatId,
		usuarioDestinoId: destino.id,
		motivo,
	});

	console.log("[INFO] [ATENDIMENTOS] [TRANSFER_TO_HUMAN] Atendimento transferido para:", destino.nome);

	// Notificação é acessória: uma falha aqui não desfaz a transferência.
	const whatsappToken = chat.whatsappConexao?.token;
	const fromPhoneNumberId = chat.whatsappConexaoTelefone?.whatsappTelefoneId;
	if (destino.telefone && whatsappToken && fromPhoneNumberId && chat.cliente) {
		try {
			const notificationPayload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
				templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
				clientName: chat.cliente.nome,
				clientePhoneNumber: chat.cliente.telefone,
				toPhoneNumber: destino.telefone,
				serviceDescription: resumo,
			}).data;

			sendTemplateWhatsappMessage({ whatsappToken, fromPhoneNumberId, templatePayload: notificationPayload }).catch((error) => {
				console.error("[ERROR] [ATENDIMENTOS] [TRANSFER_TO_HUMAN] Falha ao notificar o usuário:", error);
			});
		} catch (error) {
			console.error("[ERROR] [ATENDIMENTOS] [TRANSFER_TO_HUMAN] Erro ao preparar a notificação:", error);
		}
	}

	return { success: true, atendimentoId: atendimento?.id, usuarioDestinoId: destino.id };
}
