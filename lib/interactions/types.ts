import type { TInteractionContextMetadados } from "@/lib/whatsapp/template-variables";
import type { TClientEntity, TWhatsappTemplate } from "@/services/drizzle/schema";

export type ImmediateProcessingData = {
	interactionId: string;
	organizationId: string;
	client: {
		id: string;
		nome: string;
		telefone: string;
		email: string | null;
		analiseRFMTitulo: string | null;
		metadataProdutoMaisCompradoId: TClientEntity["metadataProdutoMaisCompradoId"];
		metadataGrupoProdutoMaisComprado: TClientEntity["metadataGrupoProdutoMaisComprado"];
	};
	campaign: {
		autorId: string;
		whatsappConexaoTelefoneId: string;
		whatsappTemplate: TWhatsappTemplate;
	};
	whatsappToken?: string;
	whatsappSessionId?: string;
	contextMetadados?: TInteractionContextMetadados;
	testing?: {
		overridePhoneNumber?: string;
		disableWhatsappCloudApi?: boolean;
		disableInternalGateway?: boolean;
	};
};

export type TWeeklyLimitMode = "enforce" | "skip";

export type ProcessSingleInteractionResult = {
	success: boolean;
	error?: string;
};

export type TSendReservedInteractionStatus = "SENT" | "QUEUED" | "FAILED";

export type TSendReservedInteractionResult = {
	success: boolean;
	status: TSendReservedInteractionStatus;
	error?: string;
};

export type TProcessOrganizationInteractionsBatchItemStatus =
	| "SENT"
	| "QUEUED"
	| "FAILED"
	| "BLOCKED"
	| "ALREADY_RESERVED"
	| "MISSING";

export type TProcessOrganizationInteractionsBatchItemResult = {
	interactionId: string;
	success: boolean;
	status: TProcessOrganizationInteractionsBatchItemStatus;
	error?: string;
};

export type TProcessOrganizationInteractionsBatchResult = {
	total: number;
	claimed: number;
	blocked: number;
	sent: number;
	queued: number;
	failed: number;
	alreadyReserved: number;
	missing: number;
	durationMs: number;
	results: TProcessOrganizationInteractionsBatchItemResult[];
};
