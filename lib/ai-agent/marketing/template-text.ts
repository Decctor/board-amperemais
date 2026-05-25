import { convertHtmlToWhatsappText } from "@/lib/message-templates";
import type { TMessageTemplateContent } from "@/schemas/message-templates";

export function getMessageTemplatePlainText(conteudo: TMessageTemplateContent): string {
	const sections: string[] = [];

	if (conteudo.cabecalho?.tipo === "TEXTO" && conteudo.cabecalho.conteudoTexto) {
		sections.push(`Cabeçalho: ${convertHtmlToWhatsappText(conteudo.cabecalho.conteudoTexto)}`);
	} else if (conteudo.cabecalho && conteudo.cabecalho.tipo !== "NENHUM") {
		sections.push(`Cabeçalho (${conteudo.cabecalho.tipo})`);
	}

	const bodyText = convertHtmlToWhatsappText(conteudo.corpo.conteudo);
	if (bodyText) sections.push(`Corpo:\n${bodyText}`);

	if (conteudo.rodape) sections.push(`Rodapé: ${convertHtmlToWhatsappText(conteudo.rodape)}`);

	if (conteudo.botoes.length > 0) {
		const buttonLines = conteudo.botoes.map((button, index) => `${index + 1}. [${button.tipo}] ${button.texto}`);
		sections.push(`Botões:\n${buttonLines.join("\n")}`);
	}

	return sections.join("\n\n").trim();
}

export const getWhatsappTemplatePlainText = getMessageTemplatePlainText;
