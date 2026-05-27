import type { TWhatsappTemplate, TWhatsappTemplateBodyParameter, TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { whatsappTemplatePhones, whatsappTemplates } from "@/services/drizzle/schema";
import type { db as DbType } from "@/services/drizzle";
import { and, count, eq, ne } from "drizzle-orm";
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

// Reverse map for converting Meta categories to local format
export const META_CATEGORY_MAP: Record<"AUTHENTICATION" | "MARKETING" | "UTILITY", TWhatsappTemplate["categoria"]> = {
	AUTHENTICATION: "AUTENTICAÇÃO",
	MARKETING: "MARKETING",
	UTILITY: "UTILIDADE",
};

// Status conversion map
export const META_STATUS_MAP: Record<
	"APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED",
	"APROVADO" | "PENDENTE" | "REJEITADO" | "PAUSADO" | "DESABILITADO"
> = {
	APPROVED: "APROVADO",
	PENDING: "PENDENTE",
	REJECTED: "REJEITADO",
	PAUSED: "PAUSADO",
	DISABLED: "DESABILITADO",
};

// Quality conversion (Meta doesn't explicitly provide quality, we'll infer PENDENTE by default)
export const META_QUALITY_MAP: Record<"HIGH" | "MEDIUM" | "LOW" | "PENDING", "ALTA" | "MEDIA" | "BAIXA" | "PENDENTE"> = {
	HIGH: "ALTA",
	MEDIUM: "MEDIA",
	LOW: "BAIXA",
	PENDING: "PENDENTE",
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

export function convertLocalComponentsToMetaComponents(components: TWhatsappTemplateComponents): MetaTemplateComponent[] {
	const metaComponents: MetaTemplateComponent[] = [];

	// Add header component if exists
	if (components.cabecalho) {
		const header = components.cabecalho;
		if (header.tipo === "text") {
			metaComponents.push({
				type: "HEADER",
				format: "TEXT",
				text: header.conteudo,
			});
		} else {
			metaComponents.push({
				type: "HEADER",
				format: header.tipo.toUpperCase(),
				example: {
					header_handle: header.exemplo ? [header.exemplo] : [],
				},
			});
		}
	}

	// Add body component
	let bodyText = convertHtmlToWhatsappText(components.corpo.conteudo);

	// Convert identificador placeholders (e.g. {{nome_cliente}}) to positional placeholders (e.g. {{1}})
	if (components.corpo.parametros.length > 0) {
		for (const param of components.corpo.parametros) {
			const identificadorPlaceholder = `{{${param.identificador}}}`;
			const numericPlaceholder = `{{${param.nome}}}`;
			bodyText = bodyText.replace(new RegExp(identificadorPlaceholder.replace(/[{}]/g, "\\$&"), "g"), numericPlaceholder);
		}
	}

	const bodyComponent: MetaTemplateComponent = {
		type: "BODY",
		text: bodyText,
	};

	if (components.corpo.parametros.length > 0) {
		bodyComponent.example = {
			body_text: [components.corpo.parametros.map((param) => param.exemplo)],
		};
	}

	metaComponents.push(bodyComponent);

	// Add footer component if exists
	if (components.rodape) {
		metaComponents.push({
			type: "FOOTER",
			text: components.rodape.conteudo,
		});
	}

	// Add buttons component if exists
	if (components.botoes && components.botoes.length > 0) {
		const buttons: MetaTemplateButton[] = [];
		for (const botao of components.botoes) {
			if (botao.tipo === "quick_reply") {
				buttons.push({
					type: "QUICK_REPLY",
					text: botao.texto,
				});
				continue;
			}

			if (botao.tipo === "url") {
				buttons.push({
					type: "URL",
					text: botao.texto,
					url: botao.dados?.url || "",
				});
				continue;
			}

			if (botao.tipo === "phone_number") {
				buttons.push({
					type: "PHONE_NUMBER",
					text: botao.texto,
					phone_number: botao.dados?.telefone || "",
				});
			}
		}

		if (buttons.length > 0) {
			metaComponents.push({
				type: "BUTTONS",
				buttons,
			});
		}
	}

	return metaComponents;
}
/**
 * Converts internal template format to WhatsApp API payload format
 */
export function convertToWhatsappApiPayload(template: Omit<TWhatsappTemplate, "autorId" | "dataInsercao">) {
	const components = convertLocalComponentsToMetaComponents(template.componentes);

	return {
		name: template.nome,
		category: WHATSAPP_CATEGORY_MAP[template.categoria],
		language: "pt_BR",
		parameter_format: "positional",
		components,
	};
}

type CreateWhatsappTemplateParams = {
	whatsappToken: string;
	whatsappBusinessAccountId: string;
	template: Omit<TWhatsappTemplate, "autorId" | "dataInsercao">;
};

type CreateWhatsappTemplateResponse = {
	whatsappTemplateId: string;
	status: string;
	message: string;
};

function getMetaApiErrorMessage(error: unknown, fallbackMessage: string): string {
	if (!axios.isAxiosError(error)) return fallbackMessage;

	const metaError = error.response?.data?.error;
	const errorUserMessage = typeof metaError?.error_user_msg === "string" ? metaError.error_user_msg.trim() : "";
	const errorMessage = typeof metaError?.message === "string" ? metaError.message.trim() : "";

	return errorUserMessage || errorMessage || fallbackMessage;
}

/**
 * Creates a template in WhatsApp Business API
 */
export async function createWhatsappTemplate({
	whatsappToken,
	whatsappBusinessAccountId,
	template,
}: CreateWhatsappTemplateParams): Promise<CreateWhatsappTemplateResponse> {
	try {
		if (!whatsappToken) {
			throw new createHttpError.InternalServerError("WhatsApp token não configurado.");
		}
		if (!whatsappBusinessAccountId) {
			throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
		}

		// Validate components
		const validation = validateTemplateComponents(template.componentes);
		if (!validation.valid) {
			throw new createHttpError.BadRequest(`Validação do template falhou: ${validation.errors.join(", ")}`);
		}

		const payload = convertToWhatsappApiPayload(template);

		console.log("[INFO] [WHATSAPP_TEMPLATE_CREATE] Creating template:", template.nome, JSON.stringify(payload, null, 2));

		const response = await axios.post(`${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates`, payload, {
			headers: {
				Authorization: `Bearer ${whatsappToken}`,
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
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_CREATE_ERROR_RESPONSE] Axios Error Response", error.response?.data);
			const errorMessage = getMetaApiErrorMessage(error, "Erro ao criar template no WhatsApp.");
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao criar o template no WhatsApp.");
	}
}

type GetWhatsappTemplatesParams = {
	whatsappToken: string;
	whatsappBusinessAccountId: string;
	fields?: string[];
	status?: "approved" | "pending" | "rejected" | "paused" | "disabled";
	limit?: number;
};

type MetaTemplateExample = {
	header_text?: string[];
	header_handle?: string[];
	body_text?: string[][];
	body_text_named_params?: Array<{ param_name: string; example: string }>;
};

type MetaTemplateButton = {
	type: string;
	text: string;
	url?: string;
	phone_number?: string;
};

type MetaTemplateComponent = {
	type: string;
	format?: string;
	text?: string;
	example?: MetaTemplateExample;
	buttons?: MetaTemplateButton[];
};

type MetaTemplate = {
	id: string;
	name: string;
	status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
	category: "AUTHENTICATION" | "MARKETING" | "UTILITY";
	language: string;
	parameter_format?: "NAMED" | "POSITIONAL";
	components: MetaTemplateComponent[];
};

type GetWhatsappTemplatesResponse = {
	templates: MetaTemplate[];
};

/**
 * Gets all templates from WhatsApp Business API with pagination support
 */
export async function getWhatsappTemplates({
	whatsappToken,
	whatsappBusinessAccountId,
	fields,
	status,
	limit = 250,
}: GetWhatsappTemplatesParams): Promise<GetWhatsappTemplatesResponse> {
	try {
		if (!whatsappToken) {
			throw new createHttpError.InternalServerError("WhatsApp token não configurado.");
		}
		if (!whatsappBusinessAccountId) {
			throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
		}

		const allTemplates: MetaTemplate[] = [];
		let nextUrl: string | null = null;
		const baseUrl = `${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates`;

		do {
			const url = nextUrl || baseUrl;
			const params = new URLSearchParams();

			if (!nextUrl) {
				if (fields && fields.length > 0) {
					params.append("fields", fields.join(","));
				}
				if (status) {
					params.append("status", status);
				}
				params.append("limit", limit.toString());
			}

			const fullUrl: string = nextUrl || `${url}?${params.toString()}`;

			console.log("[INFO] [WHATSAPP_TEMPLATES_GET] Fetching templates from:", fullUrl);

			const response = await axios.get<{ data: MetaTemplate[]; paging?: { next: string } }>(fullUrl, {
				headers: {
					Authorization: `Bearer ${whatsappToken}`,
				},
			});

			const templates = response.data.data || [];
			allTemplates.push(...templates);

			nextUrl = response.data.paging?.next || null;
		} while (nextUrl);

		console.log(`[INFO] [WHATSAPP_TEMPLATES_GET] Retrieved ${allTemplates.length} templates total`);

		return {
			templates: allTemplates,
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATES_GET_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATES_GET_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = getMetaApiErrorMessage(error, "Erro ao buscar templates do WhatsApp.");
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao buscar templates do WhatsApp.");
	}
}

type GetWhatsappTemplateByIdParams = {
	whatsappToken: string;
	templateId: string;
};

type GetWhatsappTemplateByIdResponse = {
	template: MetaTemplate;
};

/**
 * Gets a specific template by ID from WhatsApp Business API
 */
export async function getWhatsappTemplateById({
	whatsappToken,
	templateId,
}: GetWhatsappTemplateByIdParams): Promise<GetWhatsappTemplateByIdResponse> {
	try {
		if (!whatsappToken) {
			throw new createHttpError.InternalServerError("WhatsApp token não configurado.");
		}

		const url = `${GRAPH_API_BASE_URL}/${templateId}`;

		console.log("[INFO] [WHATSAPP_TEMPLATE_GET_BY_ID] Fetching template:", templateId);

		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${whatsappToken}`,
			},
		});

		return {
			template: response.data,
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATE_GET_BY_ID_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_GET_BY_ID_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = getMetaApiErrorMessage(error, "Erro ao buscar template do WhatsApp.");
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao buscar o template do WhatsApp.");
	}
}

type SyncWhatsappTemplatePhoneFromMetaParams = {
	db: typeof DbType;
	whatsappToken: string;
	existingTemplatePhone: {
		id: string;
		templateId: string;
		whatsappTemplateId: string | null;
		template: { componentes: TWhatsappTemplateComponents };
	};
};

/**
 * Sincroniza um único vínculo (template + telefone) com a Meta pelo ID do message template, sem varrer a lista completa.
 */
export async function syncWhatsappTemplatePhoneFromMeta({
	db,
	whatsappToken,
	existingTemplatePhone,
}: SyncWhatsappTemplatePhoneFromMetaParams): Promise<{ templateName: string }> {
	if (!existingTemplatePhone.whatsappTemplateId) {
		throw new createHttpError.BadRequest(
			"Este vínculo ainda não possui template na Meta. Crie o template no WhatsApp Cloud ou vincule novamente.",
		);
	}
	const { template: rawMetaTemplate } = await getWhatsappTemplateById({
		whatsappToken,
		templateId: existingTemplatePhone.whatsappTemplateId,
	});
	const metaTemplate = rawMetaTemplate as MetaTemplate;
	await updateLocalStateFromMetaTemplate({ db, metaTemplate, existingTemplatePhone });
	return { templateName: metaTemplate.name };
}

type EditWhatsappTemplateParams = {
	whatsappToken: string;
	templateId: string;
	category?: "authentication" | "marketing" | "utility";
	components?: Array<Record<string, unknown>>;
};

type EditWhatsappTemplateResponse = {
	success: boolean;
	message: string;
};

/**
 * Edits a template in WhatsApp Business API
 * Documentation: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management#edit-templates
 * Note: Only APPROVED, REJECTED, or PAUSED templates can be edited
 */
export async function editWhatsappTemplateInMeta({
	whatsappToken,
	templateId,
	category,
	components,
}: EditWhatsappTemplateParams): Promise<EditWhatsappTemplateResponse> {
	try {
		if (!whatsappToken) {
			throw new createHttpError.InternalServerError("WhatsApp token não configurado.");
		}

		const payload: Record<string, unknown> = {};
		if (category) payload.category = category;
		if (components) payload.components = components;

		console.log("[INFO] [WHATSAPP_TEMPLATE_EDIT] Editing template:", templateId, JSON.stringify(payload, null, 2));

		const response = await axios.post(`${GRAPH_API_BASE_URL}/${templateId}`, payload, {
			headers: {
				Authorization: `Bearer ${whatsappToken}`,
				"Content-Type": "application/json",
			},
		});

		return {
			success: response.data.success || false,
			message: "Template editado com sucesso no WhatsApp!",
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATE_EDIT_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_EDIT_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = getMetaApiErrorMessage(error, "Erro ao editar template do WhatsApp.");
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao editar o template do WhatsApp.");
	}
}

/**
 * Converts Meta API components format to local database format
 */
export function convertMetaComponentsToLocal(components: MetaTemplateComponent[]): TWhatsappTemplateComponents {
	const localComponents: TWhatsappTemplateComponents = {
		corpo: {
			conteudo: "",
			parametros: [],
		},
	};

	for (const component of components) {
		switch (component.type) {
			case "HEADER": {
				if (component.format === "TEXT") {
					localComponents.cabecalho = {
						tipo: "text",
						conteudo: component.text || "",
						exemplo: component.example?.header_text?.[0] || null,
					};
				} else if (component.format) {
					localComponents.cabecalho = {
						tipo: component.format.toLowerCase() as "image" | "video" | "document",
						conteudo: "",
						exemplo: component.example?.header_handle?.[0] || null,
					};
				}
				break;
			}
			case "BODY": {
				localComponents.corpo = {
					conteudo: component.text || "",
					parametros: [],
				};

				// Extract parameters from body text
				const paramRegex = /\{\{(\d+)\}\}/g;
				const paramPositions: number[] = [];

				let match = paramRegex.exec(component.text || "");
				while (match !== null) {
					const position = Number.parseInt(match[1]);
					if (!paramPositions.includes(position)) {
						paramPositions.push(position);
					}
					match = paramRegex.exec(component.text || "");
				}

				// Create parameters with examples if available
				const examples: string[] = component.example?.body_text?.[0] || [];
				paramPositions.sort((a, b) => a - b);

				for (let i = 0; i < paramPositions.length; i++) {
					localComponents.corpo.parametros.push({
						nome: paramPositions[i].toString(),
						exemplo: examples[i] || "exemplo",
						identificador: `param_${i + 1}`,
					});
				}
				break;
			}
			case "FOOTER": {
				localComponents.rodape = {
					conteudo: component.text || "",
				};
				break;
			}
			case "BUTTONS": {
				if (component.buttons && Array.isArray(component.buttons)) {
					localComponents.botoes = component.buttons.map((btn) => {
						const buttonType = btn.type.toLowerCase();
						const button: {
							tipo: "quick_reply" | "url" | "phone_number";
							texto: string;
							dados?: { url: string | null; telefone: string | null };
						} = {
							tipo: buttonType === "quick_reply" ? "quick_reply" : buttonType === "url" ? "url" : "phone_number",
							texto: btn.text || "",
						};

						if (btn.url) {
							button.dados = { url: btn.url, telefone: null };
						} else if (btn.phone_number) {
							button.dados = { url: null, telefone: btn.phone_number };
						}

						return button;
					});
				}
				break;
			}
		}
	}

	return localComponents;
}

function mergeBodyParametersWithExistingIdentifiers({
	metaParameters,
	existingParameters,
}: {
	metaParameters: TWhatsappTemplateBodyParameter[];
	existingParameters?: TWhatsappTemplateBodyParameter[] | null;
}): TWhatsappTemplateBodyParameter[] {
	if (!existingParameters?.length || metaParameters.length === 0) {
		return metaParameters;
	}

	const existingParametersByName = new Map(existingParameters.map((param) => [param.nome, param]));
	const canPreserveIdentifiers =
		existingParameters.length === metaParameters.length &&
		metaParameters.every((param) => {
			const existingParameter = existingParametersByName.get(param.nome);
			return Boolean(existingParameter?.identificador);
		});

	if (!canPreserveIdentifiers) {
		return metaParameters;
	}

	return metaParameters.map((param) => ({
		...param,
		identificador: existingParametersByName.get(param.nome)?.identificador || param.identificador,
	}));
}

function mergeSyncedHeaderWithExistingContent({
	metaHeader,
	existingHeader,
}: {
	metaHeader?: TWhatsappTemplateComponents["cabecalho"];
	existingHeader?: TWhatsappTemplateComponents["cabecalho"];
}): TWhatsappTemplateComponents["cabecalho"] {
	if (!metaHeader) {
		return metaHeader;
	}

	if (metaHeader.tipo === "text") {
		return metaHeader;
	}

	if (!existingHeader || existingHeader.tipo !== metaHeader.tipo || !existingHeader.conteudo) {
		return metaHeader;
	}

	// Keep the local file URL we already control while refreshing Meta's current handle.
	return {
		...metaHeader,
		conteudo: existingHeader.conteudo,
	};
}

function mergeSyncedComponentsWithExistingIdentifiers({
	metaComponents,
	existingComponents,
}: {
	metaComponents: TWhatsappTemplateComponents;
	existingComponents?: TWhatsappTemplateComponents | null;
}): TWhatsappTemplateComponents {
	const mergedHeader = mergeSyncedHeaderWithExistingContent({
		metaHeader: metaComponents.cabecalho,
		existingHeader: existingComponents?.cabecalho,
	});

	if (!existingComponents?.corpo?.parametros?.length || metaComponents.corpo.parametros.length === 0) {
		return {
			...metaComponents,
			cabecalho: mergedHeader,
		};
	}

	return {
		...metaComponents,
		cabecalho: mergedHeader,
		corpo: {
			...metaComponents.corpo,
			parametros: mergeBodyParametersWithExistingIdentifiers({
				metaParameters: metaComponents.corpo.parametros,
				existingParameters: existingComponents.corpo.parametros,
			}),
		},
	};
}

/**
 * Aplica o estado de um template retornado pela Meta a um registro local já vinculado
 * (tabela de templates pai + `whatsapp_template_phones`).
 */
async function updateLocalStateFromMetaTemplate({
	db,
	metaTemplate,
	existingTemplatePhone,
}: {
	db: typeof DbType;
	metaTemplate: MetaTemplate;
	existingTemplatePhone: {
		id: string;
		templateId: string;
		template: { componentes: TWhatsappTemplateComponents };
	};
}): Promise<void> {
	const localComponents = convertMetaComponentsToLocal(metaTemplate.components);
	const localStatus = META_STATUS_MAP[metaTemplate.status] || "PENDENTE";
	const localCategory = META_CATEGORY_MAP[metaTemplate.category] || "UTILIDADE";
	const mergedComponents = mergeSyncedComponentsWithExistingIdentifiers({
		metaComponents: localComponents,
		existingComponents: existingTemplatePhone.template.componentes,
	});

	await db
		.update(whatsappTemplates)
		.set({
			nome: metaTemplate.name,
			categoria: localCategory,
			componentes: mergedComponents,
		})
		.where(eq(whatsappTemplates.id, existingTemplatePhone.templateId));

	await db
		.update(whatsappTemplatePhones)
		.set({
			status: localStatus,
			qualidade: "PENDENTE",
			dataAtualizacao: new Date(),
		})
		.where(eq(whatsappTemplatePhones.id, existingTemplatePhone.id));
}

type DeleteWhatsappTemplateParams = {
	templateName: string;
};

type DeleteWhatsappTemplateResponse = {
	success: boolean;
	message: string;
};

type DeleteWhatsappTemplateInMetaParams = {
	whatsappToken: string;
	whatsappBusinessAccountId: string;
	templateName: string;
};

/**
 * Exclui um message template no WhatsApp Business (Graph API) usando credenciais da conexão.
 */
export async function deleteWhatsappTemplateInMeta({
	whatsappToken,
	whatsappBusinessAccountId,
	templateName,
}: DeleteWhatsappTemplateInMetaParams): Promise<DeleteWhatsappTemplateResponse> {
	try {
		if (!whatsappToken) {
			throw new createHttpError.InternalServerError("WhatsApp token não configurado.");
		}
		if (!whatsappBusinessAccountId) {
			throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
		}

		console.log("[INFO] [WHATSAPP_TEMPLATE_DELETE] Deleting template:", templateName);

		const response = await axios.delete(
			`${GRAPH_API_BASE_URL}/${whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`,
			{
				headers: {
					Authorization: `Bearer ${whatsappToken}`,
				},
			},
		);

		return {
			success: response.data?.success === true,
			message: "Template deletado com sucesso do WhatsApp!",
		};
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATE_DELETE_ERROR]", error);
		if (axios.isAxiosError(error)) {
			console.error("[ERROR] [WHATSAPP_TEMPLATE_DELETE_ERROR_RESPONSE]", error.response?.data);
			const errorMessage = getMetaApiErrorMessage(error, "Erro ao deletar template do WhatsApp.");
			throw new createHttpError.BadRequest(errorMessage);
		}
		throw new createHttpError.InternalServerError("Oops, algo deu errado ao deletar o template do WhatsApp.");
	}
}

/**
 * Deletes a template from WhatsApp Business API (env global — compatibilidade)
 */
export async function deleteWhatsappTemplate({ templateName }: DeleteWhatsappTemplateParams): Promise<DeleteWhatsappTemplateResponse> {
	if (!WHATSAPP_BUSINESS_ACCOUNT_ID) {
		throw new createHttpError.InternalServerError("WhatsApp Business Account ID não configurado.");
	}
	if (!WHATSAPP_AUTH_TOKEN) {
		throw new createHttpError.InternalServerError("WhatsApp auth token não configurado.");
	}
	return deleteWhatsappTemplateInMeta({
		whatsappToken: WHATSAPP_AUTH_TOKEN,
		whatsappBusinessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
		templateName,
	});
}

type SyncWhatsappTemplatesParams = {
	whatsappToken: string;
	whatsappBusinessAccountId: string;
	phoneId: string;
	organizationId: string;
	userId: string;
	db: typeof DbType;
};

type SyncWhatsappTemplatesResponse = {
	created: number;
	updated: number;
	errors: number;
	details: Array<{
		templateName: string;
		action: "created" | "updated" | "error";
		error?: string;
	}>;
};

/**
 * Synchronizes templates from WhatsApp Business API to local database
 * This function fetches all templates from Meta and creates/updates them locally
 */
export async function syncWhatsappTemplates({
	whatsappToken,
	whatsappBusinessAccountId,
	phoneId,
	organizationId,
	userId,
	db,
}: SyncWhatsappTemplatesParams): Promise<SyncWhatsappTemplatesResponse> {
	const result: SyncWhatsappTemplatesResponse = {
		created: 0,
		updated: 0,
		errors: 0,
		details: [],
	};

	try {
		console.log(`[INFO] [WHATSAPP_TEMPLATES_SYNC] Starting sync for phone ${phoneId}`);

		// Fetch all templates from Meta
		const { templates } = await getWhatsappTemplates({
			whatsappToken,
			whatsappBusinessAccountId,
		});

		console.log(`[INFO] [WHATSAPP_TEMPLATES_SYNC] Found ${templates.length} templates in Meta`);

		// Process each template
		for (const metaTemplate of templates) {
			try {
				// Check if template exists in database by whatsappTemplateId
				const existingTemplatePhone = await db.query.whatsappTemplatePhones.findFirst({
					where: and(eq(whatsappTemplatePhones.whatsappTemplateId, metaTemplate.id), eq(whatsappTemplatePhones.telefoneId, phoneId)),
					with: {
						template: true,
					},
				});

				if (existingTemplatePhone) {
					// Update existing template
					console.log(`[INFO] [WHATSAPP_TEMPLATES_SYNC] Updating template: ${metaTemplate.name}`);
					await updateLocalStateFromMetaTemplate({ db, metaTemplate, existingTemplatePhone });

					result.updated++;
					result.details.push({
						templateName: metaTemplate.name,
						action: "updated",
					});
				} else {
					const localComponents = convertMetaComponentsToLocal(metaTemplate.components);
					const localStatus = META_STATUS_MAP[metaTemplate.status] || "PENDENTE";
					const localCategory = META_CATEGORY_MAP[metaTemplate.category] || "UTILIDADE";

					// Create new template
					console.log(`[INFO] [WHATSAPP_TEMPLATES_SYNC] Creating template: ${metaTemplate.name}`);

					// Check if a parent template with this name exists for this org
					const existingParentTemplate = await db.query.whatsappTemplates.findFirst({
						where: and(eq(whatsappTemplates.nome, metaTemplate.name), eq(whatsappTemplates.organizacaoId, organizationId)),
					});

					let parentTemplateId: string;

					if (existingParentTemplate) {
						// Use existing parent template
						parentTemplateId = existingParentTemplate.id;
						const mergedComponents = mergeSyncedComponentsWithExistingIdentifiers({
							metaComponents: localComponents,
							existingComponents: existingParentTemplate.componentes,
						});

						// Update it with latest data
						await db
							.update(whatsappTemplates)
							.set({
								categoria: localCategory,
								componentes: mergedComponents,
							})
							.where(eq(whatsappTemplates.id, parentTemplateId));
					} else {
						// Create new parent template
						const [insertedTemplate] = await db
							.insert(whatsappTemplates)
							.values({
								nome: metaTemplate.name,
								categoria: localCategory,
								componentes: localComponents,
								organizacaoId: organizationId,
								autorId: userId, // Using org ID as fallback for sync
							})
							.returning({ id: whatsappTemplates.id });

						parentTemplateId = insertedTemplate.id;
					}

					// Create phone-specific record
					await db.insert(whatsappTemplatePhones).values({
						templateId: parentTemplateId,
						telefoneId: phoneId,
						whatsappTemplateId: metaTemplate.id,
						status: localStatus,
						qualidade: "PENDENTE",
					});

					result.created++;
					result.details.push({
						templateName: metaTemplate.name,
						action: "created",
					});
				}
			} catch (error) {
				console.error(`[ERROR] [WHATSAPP_TEMPLATES_SYNC] Error processing template ${metaTemplate.name}:`, error);
				result.errors++;
				result.details.push({
					templateName: metaTemplate.name,
					action: "error",
					error: error instanceof Error ? error.message : "Erro desconhecido",
				});
			}
		}

		console.log(`[INFO] [WHATSAPP_TEMPLATES_SYNC] Sync completed. Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors}`);

		return result;
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_TEMPLATES_SYNC_ERROR]", error);
		throw error;
	}
}
