import { getCurrentChatAttendance } from "@/lib/chats/attendance-state";
import { isWhatsappWindowOpen } from "@/lib/chats/whatsapp-window-status";
import type { DB, DBTransaction } from "@/services/drizzle";
import { chatMessages, chats } from "@/services/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

type TDb = DB | DBTransaction;

/** Quantas mensagens do histórico entram no contexto do turno. */
const HISTORY_MESSAGE_LIMIT = 100;

export type TChatRunContext = {
	chatId: string;
	cliente: {
		id: string;
		nome: string;
		telefone: string | null;
		email: string | null;
		cidade: string | null;
		estado: string | null;
		aniversario: Date | null;
	};
	conversa: Array<{ autor: string; texto: string; dataEnvio: Date | null }>;
	atendimento: { status: string; responsavelTipo: string; resumo: string | null } | null;
	tempo: {
		agora: string;
		fusoHorario: string;
		janelaWhatsapp: { aberta: boolean; expiraEm: Date | null };
		ultimaMensagemDoClienteEm: Date | null;
		ultimaMensagemEnviadaEm: Date | null;
	};
};

function describeAuthor(autorTipo: string): string {
	if (autorTipo === "CLIENTE") return "Cliente";
	if (autorTipo === "AI") return "Você (assistente)";
	if (autorTipo === "USUÁRIO") return "Atendente humano";
	return "Sistema";
}

/**
 * Snapshot que acompanha **sempre** o prompt do turno.
 *
 * Decisão deliberada: o modelo não deve gastar chamadas de ferramenta para redescobrir quem é
 * o cliente, o que já foi dito e que horas são. Ferramentas servem para o que varia sob
 * demanda (compras, catálogo, cashback), não para o básico do atendimento.
 *
 * O bloco `tempo` existe porque o modelo não tem relógio: sem ele, ou alucina datas, ou trata
 * a janela de 24h do WhatsApp como se sempre estivesse aberta.
 */
export async function buildChatRunContext(
	db: TDb,
	input: { organizacaoId: string; chatId: string },
): Promise<{ contexto: TChatRunContext; clienteId: string }> {
	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, input.chatId), eq(chats.organizacaoId, input.organizacaoId)),
		columns: {
			id: true,
			clienteId: true,
			whatsappJanelaDataExpiracao: true,
			ultimaMensagemEntradaData: true,
			ultimaMensagemSaidaData: true,
		},
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
					telefone: true,
					email: true,
					localizacaoCidade: true,
					localizacaoEstado: true,
					dataNascimento: true,
				},
			},
			whatsappConexao: { columns: { tipoConexao: true } },
		},
	});

	if (!chat) throw new Error("Chat não encontrado para montar o contexto do agente.");

	const mensagens = await db.query.chatMessages.findMany({
		where: and(eq(chatMessages.chatId, chat.id), eq(chatMessages.organizacaoId, input.organizacaoId)),
		orderBy: [desc(chatMessages.dataEnvio)],
		limit: HISTORY_MESSAGE_LIMIT,
		columns: {
			autorTipo: true,
			conteudoTexto: true,
			conteudoMidiaTipo: true,
			conteudoMidiaTextoProcessado: true,
			conteudoMidiaTextoProcessadoResumo: true,
			dataEnvio: true,
		},
	});

	const atendimento = await getCurrentChatAttendance(db, { organizacaoId: input.organizacaoId, chatId: chat.id });

	const agora = new Date();
	const janelaAberta = isWhatsappWindowOpen({
		expiracao: chat.whatsappJanelaDataExpiracao,
		tipoConexao: chat.whatsappConexao?.tipoConexao,
		now: agora,
	});

	return {
		clienteId: chat.clienteId,
		contexto: {
			chatId: chat.id,
			cliente: {
				id: chat.cliente.id,
				nome: chat.cliente.nome,
				telefone: chat.cliente.telefone,
				email: chat.cliente.email,
				cidade: chat.cliente.localizacaoCidade,
				estado: chat.cliente.localizacaoEstado,
				aniversario: chat.cliente.dataNascimento,
			},
			// Cronológico: o modelo lê a conversa como ela aconteceu.
			conversa: mensagens
				.slice()
				.reverse()
				.map((mensagem) => ({
					autor: describeAuthor(mensagem.autorTipo),
					// Mídia processada (áudio transcrito, imagem descrita) entra como texto — para o
					// modelo, uma nota de voz e uma mensagem escrita valem o mesmo.
					texto:
						mensagem.conteudoTexto ||
						mensagem.conteudoMidiaTextoProcessado ||
						mensagem.conteudoMidiaTextoProcessadoResumo ||
						(mensagem.conteudoMidiaTipo ? `[${mensagem.conteudoMidiaTipo}]` : ""),
					dataEnvio: mensagem.dataEnvio,
				}))
				.filter((mensagem) => mensagem.texto.length > 0),
			atendimento: atendimento ? { status: atendimento.status, responsavelTipo: atendimento.responsavelTipo, resumo: atendimento.resumo } : null,
			tempo: {
				agora: agora.toISOString(),
				fusoHorario: "America/Sao_Paulo (BRT, UTC-03:00)",
				janelaWhatsapp: { aberta: janelaAberta, expiraEm: chat.whatsappJanelaDataExpiracao },
				ultimaMensagemDoClienteEm: chat.ultimaMensagemEntradaData,
				ultimaMensagemEnviadaEm: chat.ultimaMensagemSaidaData,
			},
		},
	};
}

/** Serializa o contexto para o prompt do turno. */
export function formatChatRunContext(contexto: TChatRunContext): string {
	const cliente = contexto.cliente;
	const linhasCliente = [
		`- Nome: ${cliente.nome}`,
		cliente.telefone ? `- Telefone: ${cliente.telefone}` : null,
		cliente.email ? `- E-mail: ${cliente.email}` : null,
		cliente.cidade || cliente.estado ? `- Localização: ${[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}` : null,
	]
		.filter(Boolean)
		.join("\n");

	const conversa = contexto.conversa.map((mensagem) => `${mensagem.autor}: ${mensagem.texto}`).join("\n");

	const atendimento = contexto.atendimento
		? `\n## Atendimento em aberto\n- Status: ${contexto.atendimento.status}\n- Responsável: ${contexto.atendimento.responsavelTipo}${
				contexto.atendimento.resumo ? `\n- Resumo acumulado: ${contexto.atendimento.resumo}` : ""
			}\n`
		: "";

	return `## Cliente
${linhasCliente}

## Momento atual
- Agora: ${contexto.tempo.agora} (${contexto.tempo.fusoHorario})
- Janela de 24h do WhatsApp: ${contexto.tempo.janelaWhatsapp.aberta ? "aberta" : "fechada"}
${atendimento}
## Conversa até aqui
${conversa || "(sem mensagens anteriores)"}

Responda à última mensagem do cliente.`;
}
