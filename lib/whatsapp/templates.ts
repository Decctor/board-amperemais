import z from "zod";
import { formatPhoneAsWhatsappId, formatPhoneForInternalGateway, sanitizeTemplateParameter } from "./utils";

export type TemplateParameter =
	| {
			type: "text";
			text: string;
	  }
	| {
			type: "image";
			image: { link: string } | { id: string };
	  }
	| {
			type: "video";
			video: {
				link: string;
			};
	  }
	| {
			type: "document";
			document: {
				link: string;
				filename?: string;
			};
	  }
	| {
			type: string;
	  };

export type TemplateComponent = {
	type: string;
	sub_type?: string;
	index?: string;
	parameters?: TemplateParameter[];
	text?: string;
	buttons?: Array<{ type?: string; text?: string }>;
};

export type TemplatePayload = {
	messaging_product: string;
	to: string;
	type: "template";
	template: {
		name: string;
		language: { code: string };
		components?: TemplateComponent[];
	};
};

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
		// language: "pt_BR",
		language: "en_US",
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
	organizationName: z.string(),
	clientName: z.string(),
	clientePhoneNumber: z.string(),
	serviceDescription: z.string(),
});
type ServiceTransferNotificationsParametersInput = z.infer<typeof ServiceTransferNotificationsParametersInputSchema>;

const ServiceTransferNotificationsV2ParametersInputSchema = DefaultTemplatePayloadSchema.extend({
	templateKey: z.enum(["SERVICE_TRANSFER_NOTIFICATIONS_V2"]),
	headerMediaId: z.string().min(1),
	organizationName: z.string(),
	clientName: z.string(),
	clientePhoneNumber: z.string(),
	serviceDescription: z.string(),
});
type ServiceTransferNotificationsV2ParametersInput = z.infer<typeof ServiceTransferNotificationsV2ParametersInputSchema>;

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
			const { toPhoneNumber, organizationName, clientName, clientePhoneNumber, serviceDescription } =
				ServiceTransferNotificationsParametersInputSchema.parse(input);
			const clientWhatsappId = formatPhoneForInternalGateway(clientePhoneNumber);

			return {
				content: `Novo atendimento transferido pela IA.
Organização: ${organizationName}
Cliente: ${clientName}
Telefone: ${clientePhoneNumber}
Detalhes: ${serviceDescription}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneForInternalGateway(toPhoneNumber),
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
										parameter_name: "organizacao_nome",
										text: sanitizeTemplateParameter(organizationName),
									},
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
							{
								type: "button",
								sub_type: "url",
								index: "0",
								parameters: [
									{
										type: "text",
										text: clientWhatsappId,
									},
								],
							},
						],
					},
				},
			};
		},
	},
	SERVICE_TRANSFER_NOTIFICATIONS_V2: {
		id: "service_transfer_notifications_v2",
		title: "Notificação de Transferência de Serviço com Imagem",
		language: "pt_BR",
		type: "utility",
		getPayload: (input: ServiceTransferNotificationsV2ParametersInput) => {
			const { toPhoneNumber, headerMediaId, organizationName, clientName, clientePhoneNumber, serviceDescription } =
				ServiceTransferNotificationsV2ParametersInputSchema.parse(input);

			return {
				content: `Novo atendimento transferido pela IA.
Organização: ${organizationName}
Cliente: ${clientName}
Telefone: ${clientePhoneNumber}
Detalhes: ${serviceDescription}`,
				data: {
					messaging_product: "whatsapp",
					to: formatPhoneForInternalGateway(toPhoneNumber),
					type: "template" as const,
					template: {
						name: "service_transfer_notification_v2",
						language: { code: "pt_BR" },
						components: [
							{ type: "header", parameters: [{ type: "image", image: { id: headerMediaId } }] },
							{
								type: "body",
								parameters: [
									{ type: "text", parameter_name: "organizacao_nome", text: sanitizeTemplateParameter(organizationName) },
									{ type: "text", parameter_name: "cliente_nome", text: sanitizeTemplateParameter(clientName) },
									{ type: "text", parameter_name: "cliente_telefone", text: sanitizeTemplateParameter(clientePhoneNumber) },
									{ type: "text", parameter_name: "atendimento_detalhes", text: sanitizeTemplateParameter(serviceDescription) },
								],
							},
						],
					},
				},
			};
		},
	},
};
