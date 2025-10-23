import z from "zod";
import { formatPhoneAsWhatsappId } from "./utils";

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
export type GenericInitiationParametersInput = z.infer<typeof GenericInitiationParametersInputSchema>;

export const WHATSAPP_TEMPLATES = {
	GENERIC_INITIATION: {
		id: "hello_world ",
		title: "Inicialização de Conversa",
		language: "en_US",
		type: "marketing",
		getPayload: (input: GenericInitiationParametersInput) => {
			const { templateKey, toPhoneNumber, clientName } = GenericInitiationParametersInputSchema.parse(input);
			return {
				content: `Olá ${clientName}, tudo bem?`,
				data: { messaging_product: "whatsapp", to: toPhoneNumber, type: "template", template: { name: "hello_world", language: { code: "en_US" } } },
			};
		},
	},
	// GENERIC_INITIATION: {
	// 	id: "generic_initiation",
	// 	title: "Inicialização de Conversa",
	// 	language: "pt_BR",
	// 	type: "marketing",
	// 	getPayload: (input: GenericInitiationParametersInput) => {
	// 		const { templateKey, toPhoneNumber, clientName } = GenericInitiationParametersInputSchema.parse(input);
	// 		return {
	// 			content: `Olá ${clientName}, tudo bem?`,
	// 			data: {
	// 				messaging_product: "whatsapp",
	// 				to: formatPhoneAsWhatsappId(toPhoneNumber),
	// 				type: "template",
	// 				template: {
	// 					name: "generic_initiation",
	// 					language: {
	// 						code: "pt_BR",
	// 					},
	// 					components: [
	// 						{
	// 							type: "body",
	// 							parameters: [
	// 								{
	// 									type: "text",
	// 									parameter_name: "client_name",
	// 									text: clientName,
	// 								},
	// 							],
	// 						},
	// 					],
	// 				},
	// 			},
	// 		};
	// 	},
	// },
};

export const TemplateCategoryOptions = [
	{ id: "authentication", nome: "AUTENTICAÇÃO", value: "authentication", label: "AUTENTICAÇÃO" },
	{ id: "marketing", nome: "MARKETING", value: "marketing", label: "MARKETING" },
	{ id: "utility", nome: "UTILIDADE", value: "utility", label: "UTILIDADE" },
];
export const TemplateLanguageOptions = [
	{ id: "pt_BR", nome: "PORTUGUÊS (BRASIL)", value: "pt_BR", label: "PORTUGUÊS (BRASIL)" },
	{ id: "en_US", nome: "INGLÊS (EUA)", value: "en_US", label: "INGLÊS (EUA)" },
	{ id: "es_ES", nome: "ESPANHOL", value: "es_ES", label: "ESPANHOL" },
];
export const TemplateParameterFormatOptions = [
	{ id: "positional", nome: "POSICIONAL ({{1}}, {{2}})", value: "positional", label: "POSICIONAL ({{1}}, {{2}})" },
	{ id: "named", nome: "NOMEADO ({{cliente_nome}})", value: "named", label: "NOMEADO ({{cliente_nome}})" },
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
