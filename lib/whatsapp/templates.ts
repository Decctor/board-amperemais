import z from "zod";
import type { TWhatsappTemplate } from "../../schemas/whatsapp-templates";
import type { TWhatsappTemplateVariables } from "./template-variables";
import { formatPhoneAsWhatsappId, sanitizeTemplateParameter } from "./utils";

const DefaultTemplatePayloadSchema = z.object({
	toPhoneNumber: z.string({
		required_error: "Número de telefone não informado.",
		invalid_type_error: "Tipo não válido para número de telefone.",
	}),
});

const GenericInitiationParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["GENERIC_INITIATION"]),
	clientName: z.string({
		required_error: "Nome do cliente não informado.",
		invalid_type_error: "Tipo não válido para nome do cliente.",
	}),
});
type GenericInitiationParametersInput = z.infer<typeof GenericInitiationParametersInputSchema>;

export const WHATSAPP_TEMPLATES = {
	GENERIC_INITIATION: {
		id: "generic_initiation",
		title: "Inicialização de Conversa",
		language: "pt_BR",
		type: "marketing",
		getPayload: (input: GenericInitiationParametersInput) => {
			const { templateKey, toPhoneNumber, clientName } = GenericInitiationParametersInputSchema.parse(input);
			return {
				content: `Olá ${clientName}, tudo bem?`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneAsWhatsappId(toPhoneNumber),
					type: "template",
					template: {
						name: "generic_initiation",
						language: {
							code: "pt_BR",
						},
						components: [
							{
								type: "body",
								parameters: [
									{
										type: "text",
										parameter_name: "client_name",
										text: sanitizeTemplateParameter(clientName),
									},
								],
							},
						],
					},
				},
			};
		},
	},
};

export const TemplateCategoryOptions = [
	{ id: "AUTENTICAÇÃO", nome: "AUTENTICAÇÃO", value: "AUTENTICAÇÃO", label: "AUTENTICAÇÃO" },
	{ id: "MARKETING", nome: "MARKETING", value: "MARKETING", label: "MARKETING" },
	{ id: "UTILIDADE", nome: "UTILIDADE", value: "UTILIDADE", label: "UTILIDADE" },
];
export const TemplateLanguageOptions = [
	{ id: "pt_BR", nome: "PORTUGUÊS (BRASIL)", value: "pt_BR", label: "PORTUGUÊS (BRASIL)" },
	{ id: "en_US", nome: "INGLÊS (EUA)", value: "en_US", label: "INGLÊS (EUA)" },
	{ id: "es_ES", nome: "ESPANHOL", value: "es_ES", label: "ESPANHOL" },
];
export const TemplateParameterFormatOptions = [
	{ id: "POSICIONAL", nome: "POSICIONAL ({{1}}, {{2}})", value: "POSICIONAL", label: "POSICIONAL ({{1}}, {{2}})" },
	{ id: "NOMEADO", nome: "NOMEADO ({{cliente_nome}})", value: "NOMEADO", label: "NOMEADO ({{cliente_nome}})" },
];

export const TemplateHeaderTypeOptions = [
	{ id: "text", nome: "Texto", value: "text", label: "TEXTO" },
	{ id: "image", nome: "Imagem", value: "image", label: "IMAGEM" },
	{ id: "video", nome: "Vídeo", value: "video", label: "VÍDEO" },
	{ id: "document", nome: "Documento", value: "document", label: "DOCUMENTO" },
];

export const TemplateButtonTypeOptions = [
	{ id: "quick_reply", nome: "Resposta Rápida", value: "quick_reply", label: "RESPOSTA RÁPIDA" },
	{ id: "url", nome: "URL", value: "url", label: "URL" },
	{ id: "phone_number", nome: "Número de Telefone", value: "phone_number", label: "NÚMERO DE TELEFONE" },
];

// Report Templates
const DailyReportParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["DAILY_REPORT"]),
	periodo: z.string(),
	faturamento: z.string(),
	meta: z.string(),
	percentualMeta: z.string(),
	comparacao: z.string(),
	topVendedor1: z.string(),
	topVendedor2: z.string(),
	topVendedor3: z.string(),
	topParceiro1: z.string(),
	topParceiro2: z.string(),
	topParceiro3: z.string(),
	topProduto1: z.string(),
	topProduto2: z.string(),
	topProduto3: z.string(),
});
type DailyReportParametersInput = z.infer<typeof DailyReportParametersInputSchema>;

const WeeklyReportParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["WEEKLY_REPORT"]),
	periodo: z.string(),
	faturamento: z.string(),
	meta: z.string(),
	percentualMeta: z.string(),
	comparacao: z.string(),
	topVendedor1: z.string(),
	topVendedor2: z.string(),
	topVendedor3: z.string(),
	topParceiro1: z.string(),
	topParceiro2: z.string(),
	topParceiro3: z.string(),
	topProduto1: z.string(),
	topProduto2: z.string(),
	topProduto3: z.string(),
});
type WeeklyReportParametersInput = z.infer<typeof WeeklyReportParametersInputSchema>;

const MonthlyReportParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["MONTHLY_REPORT"]),
	periodo: z.string(),
	faturamento: z.string(),
	meta: z.string(),
	percentualMeta: z.string(),
	comparacao: z.string(),
	topVendedor1: z.string(),
	topVendedor2: z.string(),
	topVendedor3: z.string(),
	topParceiro1: z.string(),
	topParceiro2: z.string(),
	topParceiro3: z.string(),
	topProduto1: z.string(),
	topProduto2: z.string(),
	topProduto3: z.string(),
});
type MonthlyReportParametersInput = z.infer<typeof MonthlyReportParametersInputSchema>;

const ServiceTransferNotificationsParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["SERVICE_TRANSFER_NOTIFICATIONS"]),
	clientName: z.string(),
	clientePhoneNumber: z.string(),
	serviceDescription: z.string(),
});
type ServiceTransferNotificationsParametersInput = z.infer<typeof ServiceTransferNotificationsParametersInputSchema>;

export const WHATSAPP_REPORT_TEMPLATES = {
	DAILY_REPORT: {
		id: "daily_report",
		title: "Relatório Diário de Vendas",
		language: "pt_BR",
		type: "utility",
		getPayload: (input: DailyReportParametersInput) => {
			const {
				templateKey,
				toPhoneNumber,
				periodo,
				faturamento,
				meta,
				percentualMeta,
				comparacao,
				topVendedor1,
				topVendedor2,
				topVendedor3,
				topParceiro1,
				topParceiro2,
				topParceiro3,
				topProduto1,
				topProduto2,
				topProduto3,
			} = DailyReportParametersInputSchema.parse(input);
			return {
				content: `Relatório Diário de Vendas - ${periodo}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneAsWhatsappId(toPhoneNumber),
					type: "template",
					template: {
						name: "daily_report",
						language: {
							code: "pt_BR",
						},
						components: [
							{
								type: "body",
								parameters: [
									{
										type: "text",
										text: sanitizeTemplateParameter(periodo),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(faturamento),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(meta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(percentualMeta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(comparacao),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto3),
									},
								],
							},
						],
					},
				},
			};
		},
	},
	WEEKLY_REPORT: {
		id: "weekly_report",
		title: "Relatório Semanal de Vendas",
		language: "pt_BR",
		type: "utility",
		getPayload: (input: WeeklyReportParametersInput) => {
			const {
				templateKey,
				toPhoneNumber,
				periodo,
				faturamento,
				meta,
				percentualMeta,
				comparacao,
				topVendedor1,
				topVendedor2,
				topVendedor3,
				topParceiro1,
				topParceiro2,
				topParceiro3,
				topProduto1,
				topProduto2,
				topProduto3,
			} = WeeklyReportParametersInputSchema.parse(input);
			return {
				content: `Relatório Semanal de Vendas - ${periodo}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneAsWhatsappId(toPhoneNumber),
					type: "template",
					template: {
						name: "weekly_report",
						language: {
							code: "pt_BR",
						},
						components: [
							{
								type: "body",
								parameters: [
									{
										type: "text",
										text: sanitizeTemplateParameter(periodo),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(faturamento),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(meta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(percentualMeta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(comparacao),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto3),
									},
								],
							},
						],
					},
				},
			};
		},
	},
	MONTHLY_REPORT: {
		id: "monthly_report",
		title: "Relatório Mensal de Vendas",
		language: "pt_BR",
		type: "utility",
		getPayload: (input: MonthlyReportParametersInput) => {
			const {
				templateKey,
				toPhoneNumber,
				periodo,
				faturamento,
				meta,
				percentualMeta,
				comparacao,
				topVendedor1,
				topVendedor2,
				topVendedor3,
				topParceiro1,
				topParceiro2,
				topParceiro3,
				topProduto1,
				topProduto2,
				topProduto3,
			} = MonthlyReportParametersInputSchema.parse(input);
			return {
				content: `Relatório Mensal de Vendas - ${periodo}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneAsWhatsappId(toPhoneNumber),
					type: "template",
					template: {
						name: "monthly_report",
						language: {
							code: "pt_BR",
						},
						components: [
							{
								type: "body",
								parameters: [
									{
										type: "text",
										text: sanitizeTemplateParameter(periodo),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(faturamento),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(meta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(percentualMeta),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(comparacao),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topVendedor3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topParceiro3),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto1),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto2),
									},
									{
										type: "text",
										text: sanitizeTemplateParameter(topProduto3),
									},
								],
							},
						],
					},
				},
			};
		},
	},
	SERVICE_TRANSFER_NOTIFICATIONS: {
		id: "service_transfer_notifications",
		title: "Notificação de Transferência de Serviço",
		language: "pt_BR",
		type: "utility",
		getPayload: (input: ServiceTransferNotificationsParametersInput) => {
			const { templateKey, toPhoneNumber, clientName, clientePhoneNumber, serviceDescription } =
				ServiceTransferNotificationsParametersInputSchema.parse(input);

			return {
				content: `
Você recebeu uma nova transferência para ${clientName}, de telefone ${clientePhoneNumber}.
Detalhes:
${serviceDescription}.
Disponível para atendimento imediato.Um atendimento foi transferido para você ${serviceDescription}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneAsWhatsappId(toPhoneNumber),
					type: "template",
					template: {
						name: "service_transfer_notification",
						language: {
							code: "pt_BR",
						},
						components: [
							{
								type: "body",
								parameters: [
									{
										type: "text",
										parameter_name: "cliente_nome",
										text: sanitizeTemplateParameter(clientName),
									},
									{
										type: "text",
										parameter_name: "cliente_telefone",
										text: sanitizeTemplateParameter(clientePhoneNumber),
									},
									{
										type: "text",
										parameter_name: "atendimento_detalhes",
										text: sanitizeTemplateParameter(serviceDescription),
									},
								],
							},
						],
					},
				},
			};
		},
	},
};

/**
 * Converts Tiptap HTML content to plain text and replaces variable mentions with actual values
 * @param tiptapContent - HTML content from Tiptap editor with mention spans
 * @param variables - Map of variable identifiers to their actual values
 * @returns Plain text with variables replaced
 */
function parseTiptapContentAndReplaceVariables(tiptapContent: string, variables: Record<keyof TWhatsappTemplateVariables, string>): string {
	let text = tiptapContent;

	// Replace mention spans with their actual variable values
	// Pattern: <span data-type="mention" data-id="variableId" ...>{{DISPLAY_TEXT}}</span>
	text = text.replace(/<span[^>]*data-type=["']mention["'][^>]*data-id=["']([^"']+)["'][^>]*>.*?<\/span>/gi, (match, dataId) => {
		// dataId should match keys in TWhatsappTemplateVariables
		const variableValue = variables[dataId as keyof TWhatsappTemplateVariables];
		return variableValue !== undefined && variableValue !== null ? variableValue : match;
	});

	// Also handle data-label attribute in case data-id is not present
	text = text.replace(/<span[^>]*data-type=["']mention["'][^>]*data-label=["']([^"']+)["'][^>]*>.*?<\/span>/gi, (match, dataLabel) => {
		const variableValue = variables[dataLabel as keyof TWhatsappTemplateVariables];
		return variableValue !== undefined && variableValue !== null ? variableValue : match;
	});

	// Convert paragraph tags to line breaks (each <p> is a line)
	text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n");
	text = text.replace(/<p[^>]*>/gi, "");
	text = text.replace(/<\/p>/gi, "");

	// Convert <br> tags to line breaks
	text = text.replace(/<br\s*\/?>/gi, "\n");

	// Remove any remaining HTML tags (like <strong>, <em>, etc.)
	text = text.replace(/<[^>]+>/g, "");

	// Decode HTML entities
	text = text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

	// Clean up extra whitespace but preserve intentional line breaks
	text = text.replace(/[ \t]+/g, " "); // Replace multiple spaces/tabs with single space
	text = text.replace(/\n\s+/g, "\n"); // Remove spaces at the beginning of lines
	text = text.replace(/\s+\n/g, "\n"); // Remove spaces at the end of lines
	text = text.trim();

	return text;
}

type getWhatsappTemplatePayloadParams = {
	toPhoneNumber: string;
	template: {
		name: string;
		content: string;
		components: TWhatsappTemplate["componentes"];
	};
	variables: Record<keyof TWhatsappTemplateVariables, string>;
};
export function getWhatsappTemplatePayload({ toPhoneNumber, template, variables }: getWhatsappTemplatePayloadParams) {
	const components = [];

	if (template.components.corpo.parametros.length > 0) {
		components.push({
			type: "body",
			parameters: template.components.corpo.parametros.map((param) => ({
				type: "text",
				parameter_name: param.nome,
				text: sanitizeTemplateParameter(variables[param.identificador as keyof TWhatsappTemplateVariables] ?? ""),
			})),
		});
	}
	if (template.components.rodape) {
		components.push({
			type: "footer",
			text: template.components.rodape.conteudo,
		});
	}
	if (template.components.botoes) {
		components.push({
			type: "buttons",
			buttons: template.components.botoes.map((button) => ({
				type: "button",
				text: button.texto,
			})),
		});
	}

	// Parse Tiptap content and replace variables
	const formattedContent = parseTiptapContentAndReplaceVariables(template.content, variables);

	return {
		content: formattedContent,
		data: {
			messaging_product: "whatsapp",
			to: formatPhoneAsWhatsappId(toPhoneNumber),
			type: "template",
			template: {
				name: template.name,
				language: {
					code: "pt_BR",
				},
				components,
			},
		},
	};
}
