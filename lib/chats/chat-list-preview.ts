import type { TChatMessageAuthorTypeEnum, TChatMessageContentTypeEnum } from "@/schemas/enums";

/**
 * Resolve o texto de preview de um chat na inbox a partir da última mensagem.
 *
 * Substitui as colunas denormalizadas `ultima_mensagem_conteudo_tipo/texto` da `chats`,
 * removidas na migration 0053: o preview passa a sair de um join com `ultima_mensagem_id`,
 * o que elimina a chance de a denormalização divergir do histórico real.
 */

export type TChatListPreviewMessage = {
	autorTipo: TChatMessageAuthorTypeEnum;
	conteudoMidiaTipo: TChatMessageContentTypeEnum;
	conteudoTexto: string | null;
	conteudoMidiaTextoProcessado: string | null;
	conteudoMidiaArquivoNome: string | null;
};

export type TChatListMessagePreview = {
	contentType: TChatMessageContentTypeEnum | null;
	body: string;
	isOutgoing: boolean;
	isEmpty: boolean;
};

const PREVIEW_MAX_LENGTH = 80;

const MEDIA_LABELS: Record<Exclude<TChatMessageContentTypeEnum, "TEXTO">, string> = {
	IMAGEM: "Imagem",
	VIDEO: "Vídeo",
	AUDIO: "Áudio",
	DOCUMENTO: "Documento",
};

function truncatePreviewText(value: string) {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= PREVIEW_MAX_LENGTH) return normalized;
	return `${normalized.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

function resolveTextBody(message: TChatListPreviewMessage) {
	const text = message.conteudoTexto?.trim() || message.conteudoMidiaTextoProcessado?.trim();
	return text ? truncatePreviewText(text) : "Mensagem";
}

function resolveMediaBody(message: TChatListPreviewMessage & { conteudoMidiaTipo: Exclude<TChatMessageContentTypeEnum, "TEXTO"> }) {
	// A legenda vence o rótulo genérico; para documentos sem legenda, o nome do arquivo diz mais.
	const caption = message.conteudoTexto?.trim() || message.conteudoMidiaTextoProcessado?.trim();
	if (caption) return truncatePreviewText(caption);
	if (message.conteudoMidiaTipo === "DOCUMENTO" && message.conteudoMidiaArquivoNome?.trim()) {
		return truncatePreviewText(message.conteudoMidiaArquivoNome.trim());
	}
	return MEDIA_LABELS[message.conteudoMidiaTipo];
}

export function getChatListMessagePreview(message: TChatListPreviewMessage | null | undefined): TChatListMessagePreview {
	if (!message) {
		return { contentType: null, body: "Nenhuma mensagem ainda", isOutgoing: false, isEmpty: true };
	}

	const isOutgoing = message.autorTipo !== "CLIENTE";

	const { conteudoMidiaTipo } = message;
	if (conteudoMidiaTipo === "TEXTO") {
		return { contentType: "TEXTO", body: resolveTextBody(message), isOutgoing, isEmpty: false };
	}

	return { contentType: conteudoMidiaTipo, body: resolveMediaBody({ ...message, conteudoMidiaTipo }), isOutgoing, isEmpty: false };
}
