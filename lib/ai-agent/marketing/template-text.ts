import { convertHtmlToWhatsappText } from "@/lib/whatsapp/template-management";
import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";

export function getWhatsappTemplatePlainText(componentes: TWhatsappTemplateComponents): string {
	const sections: string[] = [];

	if (componentes.cabecalho?.conteudo) {
		const headerPrefix = componentes.cabecalho.tipo === "text" ? "Cabeçalho" : `Cabeçalho (${componentes.cabecalho.tipo})`;
		sections.push(`${headerPrefix}: ${componentes.cabecalho.conteudo}`);
	}

	const bodyText = convertHtmlToWhatsappText(componentes.corpo.conteudo);
	if (bodyText) {
		sections.push(`Corpo:\n${bodyText}`);
	}

	if (componentes.rodape?.conteudo) {
		sections.push(`Rodapé: ${componentes.rodape.conteudo}`);
	}

	if (componentes.botoes && componentes.botoes.length > 0) {
		const buttonLines = componentes.botoes.map((button, index) => `${index + 1}. [${button.tipo}] ${button.texto}`);
		sections.push(`Botões:\n${buttonLines.join("\n")}`);
	}

	return sections.join("\n\n").trim();
}
