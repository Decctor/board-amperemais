import type { TMessageTemplateApprovalStatus, TMessageTemplateCategory, TMessageTemplateHeaderType, TMessageTemplateQuality } from "../../types";
import type { TMetaTemplateCategory, TMetaTemplateQuality, TMetaTemplateStatus } from "./types";

export const MESSAGE_TEMPLATE_CATEGORY_TO_META: Record<TMessageTemplateCategory, "authentication" | "marketing" | "utility"> = {
	AUTENTICAÇÃO: "authentication",
	MARKETING: "marketing",
	UTILIDADE: "utility",
};

export const META_CATEGORY_TO_MESSAGE_TEMPLATE: Record<TMetaTemplateCategory, TMessageTemplateCategory> = {
	AUTHENTICATION: "AUTENTICAÇÃO",
	MARKETING: "MARKETING",
	UTILITY: "UTILIDADE",
};

export const META_STATUS_TO_MESSAGE_TEMPLATE: Record<TMetaTemplateStatus, TMessageTemplateApprovalStatus> = {
	APPROVED: "APROVADO",
	PENDING: "PENDENTE",
	REJECTED: "REJEITADO",
	PAUSED: "PAUSADO",
	DISABLED: "DESABILITADO",
};

export const META_QUALITY_TO_MESSAGE_TEMPLATE: Record<TMetaTemplateQuality, TMessageTemplateQuality> = {
	HIGH: "ALTA",
	MEDIUM: "MEDIA",
	LOW: "BAIXA",
	PENDING: "PENDENTE",
};

export const MESSAGE_TEMPLATE_HEADER_TO_META_FORMAT: Partial<Record<TMessageTemplateHeaderType, "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION">> = {
	TEXTO: "TEXT",
	IMAGEM: "IMAGE",
	IMAGEM_DINAMICA: "IMAGE",
	VIDEO: "VIDEO",
	DOCUMENTO: "DOCUMENT",
	LOCALIZAÇÃO: "LOCATION",
};

export function mapMetaStatusToMessageTemplateStatus(status: string): TMessageTemplateApprovalStatus {
	return META_STATUS_TO_MESSAGE_TEMPLATE[status as TMetaTemplateStatus] ?? "PENDENTE";
}

export function mapMetaQualityToMessageTemplateQuality(quality: string | null | undefined): TMessageTemplateQuality {
	return META_QUALITY_TO_MESSAGE_TEMPLATE[quality as TMetaTemplateQuality] ?? "PENDENTE";
}
