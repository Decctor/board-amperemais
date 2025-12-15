import type { TWhatsappTemplate, TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import axios from "axios";
import createHttpError from "http-errors";

const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_AUTH_TOKEN = process.env.META_ACCESS_TOKEN;
const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

export const WHATSAPP_CATEGORY_MAP: Record<TWhatsappTemplate["categoria"], "authentication" | "marketing" | "utility"> = {
	AUTENTICAÇÃO: "authentication",
	MARKETING: "marketing",
	UTILIDADE: "utility",
};

/**
 * Converts rich HTML content from Tiptap to WhatsApp-compatible plain text with formatting
 */
export function convertHtmlToWhatsappText(html: string): string {
	let text = html;

	// Convert bold tags
	text = text.replace(/<strong>(.*?)<\/strong>/g, "*$1*");
	text = text.replace(/<b>(.*?)<\/b>/g, "*$1*");

	// Convert italic tags
	text = text.replace(/<em>(.*?)<\/em>/g, "_$1_");
	text = text.replace(/<i>(.*?)<\/i>/g, "_$1_");

	// Convert strikethrough tags
	text = text.replace(/<s>(.*?)<\/s>/g, "~$1~");
	text = text.replace(/<del>(.*?)<\/del>/g, "~$1~");

	// Convert line breaks
	text = text.replace(/<br\s*\/?>/g, "\n");

	// Convert paragraphs
	text = text.replace(/<\/p>\s*<p>/g, "\n\n");
	text = text.replace(/<p>/g, "");
	text = text.replace(/<\/p>/g, "\n");

	// Convert headings to bold text with line breaks
	text = text.replace(/<h[1-6]>(.*?)<\/h[1-6]>/g, "*$1*\n");

	// Convert lists
	text = text.replace(/<ul>/g, "");
	text = text.replace(/<\/ul>/g, "\n");
	text = text.replace(/<ol>/g, "");
	text = text.replace(/<\/ol>/g, "\n");
	text = text.replace(/<li>(.*?)<\/li>/g, "• $1\n");

	// Handle variable tags - keep them as is
	text = text.replace(/<span[^>]+data-(?:label|id)="([^"]+)"[^>]*>.*?<\/span>/g, (match, label) => {
		// Extract the variable placeholder from the data-label or use a generic one
		const variableMatch = match.match(/{{(\d+|[a-z_]+)}}/);
		return variableMatch ? variableMatch[0] : `{{${label}}}`;
	});

	// Remove any remaining HTML tags
	text = text.replace(/<[^>]+>/g, "");

	// Clean up extra whitespace and newlines
	text = text.replace(/\n{3,}/g, "\n\n");
	text = text.trim();

	return text;
}

/**
 * Validates template components against WhatsApp requirements
 */
export function validateTemplateComponents(componentes: TWhatsappTemplateComponents): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate body content length
	const bodyText = convertHtmlToWhatsappText(componentes.corpo.conteudo);
	if (bodyText.length > 1024) {
		errors.push(`Conteúdo do corpo excede o limite de 1024 caracteres (${bodyText.length} caracteres).`);
	}

	// Validate header text length (if text type)
	if (componentes.cabecalho?.tipo === "text") {
		const headerText = componentes.cabecalho.conteudo;
		if (headerText.length > 60) {
			errors.push(`Cabeçalho de texto excede o limite de 60 caracteres (${headerText.length} caracteres).`);
		}
	}

	// Validate footer length
	if (componentes.rodape) {
		const footerText = componentes.rodape.conteudo;
		if (footerText.length > 60) {
			errors.push(`Rodapé excede o limite de 60 caracteres (${footerText.length} caracteres).`);
		}
	}

	// Validate buttons count
	if (componentes.botoes && componentes.botoes.length > 10) {
		errors.push(`Número de botões excede o limite de 10 (${componentes.botoes.length} botões).`);
	}

	// Validate button text length
	if (componentes.botoes) {
		for (const [index, botao] of componentes.botoes.entries()) {
			if (botao.texto.length > 25) {
				errors.push(`Texto do botão ${index + 1} excede o limite de 25 caracteres (${botao.texto.length} caracteres).`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Converts internal template format to WhatsApp API payload format
 */
export function convertToWhatsappApiPayload(template: Omit<TWhatsappTemplate, "_id" | "autorId" | "dataInsercao" | "status">) {
	const components: Array<Record<string, unknown>> = [];

	// Add header component if exists
	if (template.componentes.cabecalho) {
		const header = template.componentes.cabecalho;
		if (header.tipo === "text") {
			components.push({
				type: "HEADER",
				format: "TEXT",
				text: header.conteudo,
			});
		} else {
			// For media types (image, video, document)
			components.push({
				type: "HEADER",
				format: header.tipo.toUpperCase(),
				example: {
					header_handle: header.exemplo ? [header.exemplo] : [],
				},
			});
		}
	}

	// Add body component
	let bodyText = convertHtmlToWhatsappText(template.componentes.corpo.conteudo);

	// Replace any identificador-based variables with their numeric positions
	// This handles mention nodes that were inserted via autocomplete
	if (template.componentes.corpo.parametros.length > 0) {
		for (const param of template.componentes.corpo.parametros) {
			// Replace {{identificador}} with {{numero}}
			const identificadorPlaceholder = `{{${param.identificador}}}`;
			const numericPlaceholder = `{{${param.nome}}}`;
			bodyText = bodyText.replace(new RegExp(identificadorPlaceholder.replace(/[{}]/g, "\\$&"), "g"), numericPlaceholder);
		}
	}

	const bodyComponent: Record<string, unknown> = {
		type: "body",
		text: bodyText,
	};

	if (template.componentes.corpo.parametros.length > 0) {
		// positional
		bodyComponent.example = {
			body_text: [template.componentes.corpo.parametros.map((param) => param.exemplo)],
		};
	}

	components.push(bodyComponent);

	// Add footer component if exists
	if (template.componentes.rodape) {
		components.push({
			type: "FOOTER",
			text: template.componentes.rodape.conteudo,
		});
	}

	// Add buttons component if exists
	if (template.componentes.botoes && template.componentes.botoes.length > 0) {
		const buttons = template.componentes.botoes
			.map((botao) => {
				if (botao.tipo === "quick_reply") {
					return {
						type: "QUICK_REPLY",
						text: botao.texto,
					};
				}
				if (botao.tipo === "url") {
					return {
						type: "URL",
						text: botao.texto,
						url: botao.dados?.url || "",
					};
				}
				if (botao.tipo === "phone_number") {
					return {
						type: "PHONE_NUMBER",
						text: botao.texto,
						phone_number: botao.dados?.telefone || "",
					};
				}
				return null;
			})
			.filter(Boolean);

		if (buttons.length > 0) {
			components.push({
				type: "BUTTONS",
				buttons,
			});
		}
	}

	return {
		name: template.nome,
		category: WHATSAPP_CATEGORY_MAP[template.categoria],
		language: "pt_BR",
		parameter_format: "positional",
		components,
	};
}

type CreateWhatsappTemplateParams = {
	template: Omit<TWhatsappTemplate, "_id" | "autor" | "dataInsercao" | "status" | "whatsappTemplateId">;
};

type CreateWhatsappTemplateResponse = {
	whatsappTemplateId: string;
	status: string;
	message: string;
};

/**
 * Creates a template in WhatsApp Business API
 */
export async function createWhatsappTemplate({ template }: CreateWhatsappTemplateParams): Promise<CreateWhatsappTemplateResponse> {
	try {
		if (!WHATSAPP_BUSINESS_ACCOUNT_ID) {
			throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
		}
		if (!WHATSAPP_AUTH_TOKEN) {
			throw new createHttpError.InternalServerError("WhatsApp auth token não configurado.");
		}

		// Validate components
		const validation = validateTemplateComponents(template.componentes);
		if (!validation.valid) {
			throw new createHttpError.BadRequest(`Validação do template falhou: ${validation.errors.join(", ")}`);
		}

		const payload = convertToWhatsappApiPayload(template);

		console.log("[INFO] [WHATSAPP_TEMPLATE_CREATE] Creating template:", template.nome, JSON.stringify(payload, null, 2));

		const response = await axios.post(`${GRAPH_API_BASE_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`, payload, {
			headers: {
				Authorization: `Bearer ${WHATSAPP_AUTH_TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		const whatsappTemplateId = response.data.id;
		const status = response.data.status || "PENDING";

		if (!whatsappTemplateId) {
			throw new createHttpError.InternalServerError("WhatsApp template ID não retornado.");
		}

		return {
			whatsappTemplateId,
			status,
			message: "Template criado com sucesso no WhatsApp!",
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATE_CREATE_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_CREATE_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = error.response?.data?.error?.message || "Erro ao criar template no WhatsApp.";
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao criar o template no WhatsApp.");
	}
}

type DeleteWhatsappTemplateParams = {
	templateName: string;
};

type DeleteWhatsappTemplateResponse = {
	success: boolean;
	message: string;
};

/**
 * Deletes a template from WhatsApp Business API
 */
export async function deleteWhatsappTemplate({ templateName }: DeleteWhatsappTemplateParams): Promise<DeleteWhatsappTemplateResponse> {
	try {
		if (!WHATSAPP_BUSINESS_ACCOUNT_ID) {
			throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
		}
		if (!WHATSAPP_AUTH_TOKEN) {
			throw new createHttpError.InternalServerError("WhatsApp auth token não configurado.");
		}

		console.log("[INFO] [WHATSAPP_TEMPLATE_DELETE] Deleting template:", templateName);

		const response = await axios.delete(
			`${GRAPH_API_BASE_URL}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(templateName)}`,
			{
				headers: {
					Authorization: `Bearer ${WHATSAPP_AUTH_TOKEN}`,
				},
			},
		);

		return {
			success: response.data.success || false,
			message: "Template deletado com sucesso do WhatsApp!",
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATE_DELETE_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_DELETE_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = error.response?.data?.error?.message || "Erro ao deletar template do WhatsApp.";
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao deletar o template do WhatsApp.");
	}
}
