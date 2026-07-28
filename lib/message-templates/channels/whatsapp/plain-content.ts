import { convertHtmlToWhatsappText } from "../../formatting";
import { replaceMessageTemplateVariables } from "../../parsing";
import type { TMessageTemplateEntityLike, TMessageTemplateRuntimeContext } from "../../types";

/**
 * Renderiza o texto plano de um template do jeito que ele chega no WhatsApp.
 *
 * Usado para persistir `chat_messages.conteudo_texto` (o payload enviado à Meta é
 * estruturado em componentes, então sem isso a thread mostraria a mensagem vazia) e como
 * fallback do Gateway Interno, que não tem conceito de template.
 */
export function buildWhatsappPlainContent({
	template,
	variables,
}: {
	template: TMessageTemplateEntityLike;
	variables: TMessageTemplateRuntimeContext["variaveis"];
}) {
	const header =
		template.conteudo.cabecalho?.tipo === "TEXTO" && template.conteudo.cabecalho.conteudoTexto
			? convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.cabecalho.conteudoTexto, variables))
			: "";
	const body = convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.corpo.conteudo, variables));
	const footer = template.conteudo.rodape ? convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.rodape, variables)) : "";
	return [header, body, footer].filter(Boolean).join("\n\n");
}
