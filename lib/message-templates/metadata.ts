import type { TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { TMessageTemplateApprovalStatus, TMessageTemplateQuality } from "./types";

export function createEmptyMessageTemplateMetadata(): TMessageTemplateMetadata {
	return { porNumeroTelefone: {} };
}

export function computeWorstMessageTemplateStatus(statuses: TMessageTemplateApprovalStatus[]): TMessageTemplateApprovalStatus {
	const priority: TMessageTemplateApprovalStatus[] = ["REJEITADO", "DESABILITADO", "PAUSADO", "PENDENTE", "RASCUNHO", "APROVADO"];
	return priority.find((status) => statuses.includes(status)) ?? "RASCUNHO";
}

export function computeWorstMessageTemplateQuality(qualities: TMessageTemplateQuality[]): TMessageTemplateQuality {
	const priority: TMessageTemplateQuality[] = ["BAIXA", "MEDIA", "PENDENTE", "ALTA"];
	return priority.find((quality) => qualities.includes(quality)) ?? "PENDENTE";
}

export function filterMessageTemplateMetadataByPhoneIds({
	metadata,
	phoneIds,
}: {
	metadata: TMessageTemplateMetadata;
	phoneIds: ReadonlySet<string>;
}): TMessageTemplateMetadata {
	return {
		...metadata,
		porNumeroTelefone: Object.fromEntries(Object.entries(metadata.porNumeroTelefone).filter(([phoneId]) => phoneIds.has(phoneId))),
	};
}

export function withComputedMessageTemplateStatus<T extends { metadados: TMessageTemplateMetadata }>(
	template: T,
	connectedPhoneIds?: ReadonlySet<string>,
) {
	const metadados = connectedPhoneIds
		? filterMessageTemplateMetadataByPhoneIds({ metadata: template.metadados, phoneIds: connectedPhoneIds })
		: template.metadados;
	const phoneMetadata = Object.values(metadados.porNumeroTelefone);
	return {
		...template,
		metadados,
		statusGeral: phoneMetadata.length > 0 ? computeWorstMessageTemplateStatus(phoneMetadata.map((metadata) => metadata.status)) : "RASCUNHO",
		qualidadeGeral: phoneMetadata.length > 0 ? computeWorstMessageTemplateQuality(phoneMetadata.map((metadata) => metadata.qualidade)) : "PENDENTE",
		telefonesTotal: phoneMetadata.length,
		telefonesAprovados: phoneMetadata.filter((metadata) => metadata.status === "APROVADO").length,
	};
}
