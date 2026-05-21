import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";

export type TMessageTemplateChannel = "WHATSAPP" | "EMAIL";
export type TMessageTemplateStatus = "RASCUNHO" | "ATIVO" | "ARQUIVADO";
export type TMessageTemplateCategory = "AUTENTICAÇÃO" | "MARKETING" | "UTILIDADE";
export type TMessageTemplateApprovalStatus = "RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "PAUSADO" | "DESABILITADO";
export type TMessageTemplateQuality = "PENDENTE" | "ALTA" | "MEDIA" | "BAIXA";

export type TMessageTemplateHeaderType = NonNullable<TMessageTemplateContent["cabecalho"]>["tipo"];
export type TMessageTemplateButton = TMessageTemplateContent["botoes"][number];
export type TMessageTemplateParameter = TMessageTemplateContent["corpo"]["parametros"][number];

export type TMessageTemplateEntityLike = {
	id?: string;
	nome: string;
	status?: TMessageTemplateStatus;
	categoria: TMessageTemplateCategory;
	linguagem: string;
	conteudo: TMessageTemplateContent;
	metadados: TMessageTemplateMetadata;
};

export type TMessageTemplateRuntimeValues = Record<string, string | number | boolean | Date | null | undefined>;

export type TMessageTemplateRuntimeContext = {
	origin: string;
	organizacaoId: string;
	clienteId?: string | null;
	interactionId?: string | null;
	variaveis: TMessageTemplateRuntimeValues;
	cabecalhoMidiaUrl?: string | null;
};

export type TMessageTemplateValidationIssue = {
	path: string;
	message: string;
	severity: "error" | "warning";
};

export type TMessageTemplateValidationResult = {
	valid: boolean;
	issues: TMessageTemplateValidationIssue[];
};

export type TMessageTemplatePhoneMetadata = TMessageTemplateMetadata["porNumeroTelefone"][string];

export type TMessageTemplateMetadataPatch = {
	porNumeroTelefone: TMessageTemplateMetadata["porNumeroTelefone"];
};
