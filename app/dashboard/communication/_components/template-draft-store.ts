"use client";

import { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";

export type TTemplateChannel = "WHATSAPP" | "EMAIL";
export type TTemplateStatus = "RASCUNHO" | "ATIVO" | "ARQUIVADO";
export type TTemplateCategory = "AUTENTICAÇÃO" | "MARKETING" | "UTILIDADE";

export type TTemplateParameterDraft = {
	identificadorInterno: string;
	identificadorExterno: string;
	exemplo: string;
};

export type TTemplateButtonDraft =
	| { tipo: "URL"; texto: string; url: string }
	| { tipo: "URL_PRESET"; preset: "CLIENT_POI_PROFILE"; texto: string; exemplo: string }
	| { tipo: "RESPOSTA RÁPIDA"; texto: string }
	| { tipo: "TELEFONE"; texto: string; telefone: string };

export type TMessageTemplateDraft = {
	id: string;
	nome: string;
	status: TTemplateStatus;
	categoria: TTemplateCategory;
	linguagem: string;
	canais: TTemplateChannel[];
	email: {
		assunto: string;
		preheader: string;
	};
	cabecalho: {
		tipo: "NENHUM" | "TEXTO" | "IMAGEM" | "VIDEO" | "DOCUMENTO";
		conteudoTexto: string;
		conteudoMidiaUrl: string;
	};
	corpo: {
		conteudo: string;
		parametros: TTemplateParameterDraft[];
	};
	rodape: string;
	botoes: TTemplateButtonDraft[];
	dataInsercao: string;
	dataAtualizacao: string;
};

export const MESSAGE_TEMPLATE_DRAFTS_STORAGE_KEY = "recompra:message-template-drafts";

export const MessageTemplateNativeVariables = WhatsappTemplateVariables.map((variable) => ({
	identificador: variable.value,
	label: variable.label,
	description: variable.description,
	contexto: variable.contexto,
	metaId: variable.id,
}));

export const MessageTemplateNativeVariablesById = new Map<string, (typeof MessageTemplateNativeVariables)[number]>(
	MessageTemplateNativeVariables.map((variable) => [variable.identificador, variable]),
);

export const MessageTemplateVariableExampleValues: Record<string, string> = {
	clientName: "Lucas",
	clientPhoneNumber: "(11) 99999-9999",
	clientEmail: "lucas@exemplo.com",
	clientSegmentation: "Cliente VIP",
	clientFavoriteProduct: "Cappuccino",
	clientFavoriteProductGroup: "Cafés especiais",
	clientSuggestedProduct: "Croissant artesanal",
	purchaseValue: "R$ 120,00",
	purchaseCashbackAccumulated: "R$ 12,00",
	purchaseCashbackNewBalance: "R$ 42,00",
	purchaseSellerName: "Mariana",
	cashbackAvailableBalance: "R$ 42,00",
	cashbackLifetimeAccumulated: "R$ 180,00",
	cashbackLifetimeRedeemed: "R$ 138,00",
	cashbackExpiringAmount: "R$ 10,00",
	cashbackExpiringDate: "27/05/2026",
};

export function getDefaultMessageTemplateVariableExample(identifier: string) {
	return MessageTemplateVariableExampleValues[identifier] ?? "Exemplo";
}

export function buildEmptyMessageTemplateDraft(organizationName: string): TMessageTemplateDraft {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		nome: "",
		status: "RASCUNHO",
		categoria: "MARKETING",
		linguagem: "pt_BR",
		canais: ["WHATSAPP", "EMAIL"],
		email: {
			assunto: "",
			preheader: "",
		},
		cabecalho: {
			tipo: "NENHUM",
			conteudoTexto: "",
			conteudoMidiaUrl: "",
		},
		corpo: {
			conteudo: `Olá {{clientName}}, temos uma condição especial esperando por você na ${organizationName}.`,
			parametros: [
				{
					identificadorInterno: "clientName",
					identificadorExterno: "1",
					exemplo: getDefaultMessageTemplateVariableExample("clientName"),
				},
			],
		},
		rodape: "Responda esta mensagem se quiser falar com nossa equipe.",
		botoes: [{ tipo: "URL", texto: "Ver oferta", url: "https://recompracrm.com.br" }],
		dataInsercao: now,
		dataAtualizacao: now,
	};
}

export function getStoredMessageTemplateDrafts(): TMessageTemplateDraft[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(MESSAGE_TEMPLATE_DRAFTS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function upsertStoredMessageTemplateDraft(template: TMessageTemplateDraft) {
	const current = getStoredMessageTemplateDrafts();
	const nextTemplate = { ...template, dataAtualizacao: new Date().toISOString() };
	const next = current.some((item) => item.id === template.id) ? current.map((item) => (item.id === template.id ? nextTemplate : item)) : [nextTemplate, ...current];
	window.localStorage.setItem(MESSAGE_TEMPLATE_DRAFTS_STORAGE_KEY, JSON.stringify(next));
	return nextTemplate;
}

export function findStoredMessageTemplateDraft(id: string) {
	return getStoredMessageTemplateDrafts().find((template) => template.id === id) ?? null;
}

export function extractTemplateVariables(sources: string[]) {
	const identifiers = new Set<string>();
	for (const source of sources) {
		for (const match of source.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
			if (match[1] && MessageTemplateNativeVariablesById.has(match[1])) identifiers.add(match[1]);
		}
	}
	return Array.from(identifiers);
}

export function extractUnknownTemplateVariables(sources: string[]) {
	const identifiers = new Set<string>();
	for (const source of sources) {
		for (const match of source.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
			if (match[1] && !MessageTemplateNativeVariablesById.has(match[1])) identifiers.add(match[1]);
		}
	}
	return Array.from(identifiers);
}

export function replaceTemplateVariables(text: string, parametros: TTemplateParameterDraft[]) {
	return parametros.reduce((result, parametro) => {
		const value = parametro.exemplo || `{{${parametro.identificadorInterno}}}`;
		return result.replaceAll(new RegExp(`\\{\\{\\s*${parametro.identificadorInterno}\\s*\\}\\}`, "g"), value);
	}, text);
}
