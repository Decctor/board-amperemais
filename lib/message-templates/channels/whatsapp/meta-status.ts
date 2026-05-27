import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { TMessageTemplateCategory, TMessageTemplatePhoneMetadata } from "../../types";
import { META_CATEGORY_TO_MESSAGE_TEMPLATE, mapMetaQualityToMessageTemplateQuality, mapMetaStatusToMessageTemplateStatus } from "./meta-maps";
import type { TMetaTemplate, TMetaTemplateButton, TMetaTemplateComponent } from "./types";

export function extractWhatsappTemplatePhoneMetadataFromMeta(metaTemplate: TMetaTemplate): TMessageTemplatePhoneMetadata {
	return {
		idExterno: metaTemplate.id,
		status: mapMetaStatusToMessageTemplateStatus(metaTemplate.status),
		qualidade: mapMetaQualityToMessageTemplateQuality(metaTemplate.quality_score?.score),
	};
}

export function buildWhatsappMetadataPatchFromMeta({
	currentMetadata,
	connectionId,
	metaTemplate,
}: {
	currentMetadata: TMessageTemplateMetadata;
	connectionId: string;
	metaTemplate: TMetaTemplate;
}): TMessageTemplateMetadata {
	return {
		...currentMetadata,
		porNumeroTelefone: {
			...currentMetadata.porNumeroTelefone,
			[connectionId]: extractWhatsappTemplatePhoneMetadataFromMeta(metaTemplate),
		},
	};
}

export function extractWhatsappCategoryFromMeta(metaTemplate: TMetaTemplate): TMessageTemplateCategory {
	return META_CATEGORY_TO_MESSAGE_TEMPLATE[metaTemplate.category] ?? "UTILIDADE";
}

export function extractWhatsappContentFromMeta(metaTemplate: TMetaTemplate): TMessageTemplateContent {
	const content: TMessageTemplateContent = {
		assunto: "",
		preheader: "",
		cabecalho: null,
		corpo: {
			conteudo: "",
			parametros: [],
		},
		rodape: null,
		botoes: [],
	};

	for (const component of metaTemplate.components) {
		if (component.type === "HEADER") content.cabecalho = extractHeaderFromMetaComponent(component);
		if (component.type === "BODY") content.corpo = extractBodyFromMetaComponent(component);
		if (component.type === "FOOTER") content.rodape = component.text ?? null;
		if (component.type === "BUTTONS") content.botoes = extractButtonsFromMetaComponent(component);
	}

	return content;
}

function extractHeaderFromMetaComponent(component: TMetaTemplateComponent): TMessageTemplateContent["cabecalho"] {
	if (component.format === "TEXT") {
		return {
			tipo: "TEXTO",
			conteudoTexto: component.text ?? "",
			conteudoMidiaUrl: null,
			conteudoMidiaHandle: null,
			conteudoLocalizacao: null,
		};
	}

	if (component.format === "IMAGE" || component.format === "VIDEO" || component.format === "DOCUMENT") {
		return {
			tipo: component.format === "IMAGE" ? "IMAGEM" : component.format === "VIDEO" ? "VIDEO" : "DOCUMENTO",
			conteudoTexto: null,
			conteudoMidiaUrl: null,
			conteudoMidiaHandle: component.example?.header_handle?.[0] ?? null,
			conteudoLocalizacao: null,
		};
	}

	return null;
}

function extractBodyFromMetaComponent(component: TMetaTemplateComponent): TMessageTemplateContent["corpo"] {
	const text = component.text ?? "";
	const positions = Array.from(new Set(Array.from(text.matchAll(/\{\{(\d+)\}\}/g)).map((match) => Number(match[1])))).sort((a, b) => a - b);
	const examples = component.example?.body_text?.[0] ?? [];

	return {
		conteudo: text,
		parametros: positions.map((position, index) => ({
			identificadorInterno: `param_${position}`,
			identificadorExterno: String(position),
			exemplo: examples[index] ?? "Exemplo",
		})),
	};
}

function extractButtonsFromMetaComponent(component: TMetaTemplateComponent): TMessageTemplateContent["botoes"] {
	return (component.buttons ?? []).map((button) => extractButtonFromMetaButton(button));
}

function extractButtonFromMetaButton(button: TMetaTemplateButton): TMessageTemplateContent["botoes"][number] {
	if (button.type === "QUICK_REPLY") return { tipo: "RESPOSTA RÁPIDA", texto: button.text };
	if (button.type === "PHONE_NUMBER") return { tipo: "TELEFONE", texto: button.text, telefone: button.phone_number ?? "" };
	return { tipo: "URL", texto: button.text, url: button.url ?? "" };
}
