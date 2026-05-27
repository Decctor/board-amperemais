import { whatsappTemplateComponentsToMessageContent } from "@/lib/message-templates/adapters/whatsapp-components";
import { normalizeMessageTemplateContentParameters } from "@/lib/message-templates/parsing";
import type { TMessageTemplateApprovalStatus, TMessageTemplateStatus } from "@/lib/message-templates/types";
import type { TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { TWhatsappTemplatePhone } from "@/services/drizzle/schema/whatsapp-templates";
import type { TWhatsappTemplate } from "@/services/drizzle/schema/whatsapp-templates";

export type TWhatsappTemplateWithPhones = TWhatsappTemplate & {
	telefones: TWhatsappTemplatePhone[];
};

export type TParsedMessageTemplateFromWhatsapp = {
	legacyWhatsappTemplateId: string;
	organizacaoId: string;
	nome: string;
	status: TMessageTemplateStatus;
	alerta: string | null;
	metadados: TMessageTemplateMetadata;
	conteudo: ReturnType<typeof normalizeMessageTemplateContentParameters>;
	linguagem: string;
	categoria: TWhatsappTemplate["categoria"];
	autorId: string;
	dataInsercao: Date;
};

function deriveMessageTemplateEntityStatus(phoneStatuses: TMessageTemplateApprovalStatus[]): TMessageTemplateStatus {
	if (phoneStatuses.length === 0) return "RASCUNHO";
	if (phoneStatuses.some((status) => status === "APROVADO")) return "ATIVO";
	if (phoneStatuses.every((status) => status === "REJEITADO" || status === "DESABILITADO" || status === "PAUSADO")) {
		return "ARQUIVADO";
	}
	return "RASCUNHO";
}

function buildMessageTemplateMetadataFromWhatsappPhones(telefones: TWhatsappTemplatePhone[]): TMessageTemplateMetadata {
	const porNumeroTelefone: TMessageTemplateMetadata["porNumeroTelefone"] = {};

	for (const telefone of telefones) {
		porNumeroTelefone[telefone.telefoneId] = {
			idExterno: telefone.whatsappTemplateId ?? "",
			status: telefone.status,
			qualidade: telefone.qualidade,
		};
	}

	return { porNumeroTelefone };
}

function buildAlertaFromWhatsappPhones(telefones: TWhatsappTemplatePhone[]): string | null {
	return telefones.find((telefone) => telefone.rejeicao)?.rejeicao ?? null;
}

/** Converte um registro legado de `whatsapp_templates` para o formato de `message_templates`. */
export function parseWhatsappTemplateIntoMessageTemplate(template: TWhatsappTemplateWithPhones): TParsedMessageTemplateFromWhatsapp | null {
	if (!template.organizacaoId) return null;

	const phoneStatuses = template.telefones.map((telefone) => telefone.status);

	return {
		legacyWhatsappTemplateId: template.id,
		organizacaoId: template.organizacaoId,
		nome: template.nome,
		status: deriveMessageTemplateEntityStatus(phoneStatuses),
		alerta: buildAlertaFromWhatsappPhones(template.telefones),
		metadados: buildMessageTemplateMetadataFromWhatsappPhones(template.telefones),
		conteudo: normalizeMessageTemplateContentParameters(whatsappTemplateComponentsToMessageContent(template.componentes)),
		linguagem: "pt_BR",
		categoria: template.categoria,
		autorId: template.autorId,
		dataInsercao: template.dataInsercao,
	};
}
