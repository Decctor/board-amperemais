import type { TMessageTemplateContent } from "@/schemas/message-templates";
import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";

const emptyCabecalhoFields = {
	imagemDinamicaPreset: null,
	conteudoTexto: null,
	conteudoMidiaUrl: null,
	conteudoMidiaHandle: null,
	conteudoLocalizacao: null,
} as const;

function mapWhatsappHeaderTipo(tipo: NonNullable<TWhatsappTemplateComponents["cabecalho"]>["tipo"]): NonNullable<TMessageTemplateContent["cabecalho"]>["tipo"] {
	if (tipo === "text") return "TEXTO";
	if (tipo === "image") return "IMAGEM";
	if (tipo === "video") return "VIDEO";
	return "DOCUMENTO";
}

function mapWhatsappButton(
	button: NonNullable<TWhatsappTemplateComponents["botoes"]>[number],
): TMessageTemplateContent["botoes"][number] {
	if (button.tipo === "quick_reply") return { tipo: "RESPOSTA RÁPIDA", texto: button.texto };
	if (button.tipo === "phone_number") {
		return { tipo: "TELEFONE", texto: button.texto, telefone: button.dados?.telefone ?? "" };
	}
	return { tipo: "URL", texto: button.texto, url: button.dados?.url ?? "" };
}

/** Converte o formato legado de componentes WhatsApp para `MessageTemplateContentSchema`. */
export function whatsappTemplateComponentsToMessageContent(components: TWhatsappTemplateComponents): TMessageTemplateContent {
	const cabecalho = components.cabecalho
		? {
				tipo: mapWhatsappHeaderTipo(components.cabecalho.tipo),
				...emptyCabecalhoFields,
				conteudoTexto: components.cabecalho.tipo === "text" ? components.cabecalho.conteudo : null,
				conteudoMidiaUrl: components.cabecalho.tipo !== "text" ? components.cabecalho.conteudo : null,
			}
		: null;

	return {
		assunto: "",
		preheader: "",
		cabecalho,
		corpo: {
			conteudo: components.corpo.conteudo,
			parametros: components.corpo.parametros.map((parametro) => ({
				identificadorInterno: parametro.identificador || parametro.nome,
				identificadorExterno: null,
				exemplo: parametro.exemplo,
			})),
		},
		rodape: components.rodape?.conteudo ?? null,
		botoes: (components.botoes ?? []).map(mapWhatsappButton),
	};
}
