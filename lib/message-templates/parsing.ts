import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { TMessageTemplateParameter, TMessageTemplateRuntimeValues } from "./types";
import {
	getDefaultMessageTemplateVariableExample,
	isAllowedMessageTemplateVariable,
	MessageTemplateNativeVariables,
} from "./variables";

const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const TEMPLATE_VARIABLE_TOKEN_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;
const MENTION_SPAN_REGEX = /<span[^>]*data-type=["']mention["'][^>]*>[\s\S]*?<\/span>/gi;

export function replaceMessageTemplateMentionSpansWithVariables(text: string) {
	return text.replace(MENTION_SPAN_REGEX, (match) => {
		const dataIdMatch = match.match(/data-id=["']([^"']+)["']/i);
		if (dataIdMatch?.[1]) return `{{${dataIdMatch[1]}}}`;

		const dataLabelMatch = match.match(/data-label=["']([^"']+)["']/i);
		if (dataLabelMatch?.[1] && isAllowedMessageTemplateVariable(dataLabelMatch[1])) return `{{${dataLabelMatch[1]}}}`;

		return match;
	});
}

function resolveMessageTemplateVariableToken(token: string) {
	const trimmed = token.trim();
	if (isAllowedMessageTemplateVariable(trimmed)) return trimmed;

	const normalizedToken = trimmed.toLowerCase();
	const byIdentificador = MessageTemplateNativeVariables.find((item) => item.identificador.toLowerCase() === normalizedToken);
	if (byIdentificador) return byIdentificador.identificador;

	const byLabel = MessageTemplateNativeVariables.find((item) => item.label.toLowerCase() === normalizedToken);
	if (byLabel) return byLabel.identificador;

	return null;
}

function normalizeMessageTemplateVariableTokensInText(text: string) {
	let normalizedText = replaceMessageTemplateMentionSpansWithVariables(text);

	return normalizedText.replace(TEMPLATE_VARIABLE_TOKEN_REGEX, (match, token) => {
		const identificadorInterno = resolveMessageTemplateVariableToken(token);
		return identificadorInterno ? `{{${identificadorInterno}}}` : match;
	});
}

function extractOrderedMessageTemplateVariablesFromText(text: string) {
	const normalizedText = replaceMessageTemplateMentionSpansWithVariables(text);
	const identifiers: string[] = [];
	const seen = new Set<string>();

	for (const match of normalizedText.matchAll(TEMPLATE_VARIABLE_TOKEN_REGEX)) {
		const token = match[1]?.trim();
		if (!token) continue;

		const identificadorInterno = resolveMessageTemplateVariableToken(token);
		if (!identificadorInterno || seen.has(identificadorInterno)) continue;

		seen.add(identificadorInterno);
		identifiers.push(identificadorInterno);
	}

	return identifiers;
}

export function extractMessageTemplateVariables(sources: Array<string | null | undefined>) {
	const identifiers: string[] = [];
	const seen = new Set<string>();

	for (const source of sources) {
		if (!source) continue;
		for (const identificadorInterno of extractOrderedMessageTemplateVariablesFromText(source)) {
			if (seen.has(identificadorInterno)) continue;
			seen.add(identificadorInterno);
			identifiers.push(identificadorInterno);
		}
	}

	return identifiers;
}

export function extractUnknownMessageTemplateVariables(sources: Array<string | null | undefined>) {
	const identifiers: string[] = [];
	const seen = new Set<string>();

	for (const source of sources) {
		if (!source) continue;

		const normalizedText = replaceMessageTemplateMentionSpansWithVariables(source);
		for (const match of normalizedText.matchAll(TEMPLATE_VARIABLE_TOKEN_REGEX)) {
			const token = match[1]?.trim();
			if (!token || resolveMessageTemplateVariableToken(token) || seen.has(token)) continue;
			seen.add(token);
			identifiers.push(token);
		}
	}

	return identifiers;
}

export function getMessageTemplateVariableSources(content: TMessageTemplateContent) {
	return [
		content.assunto,
		content.preheader,
		content.cabecalho?.conteudoTexto,
		content.corpo.conteudo,
		content.rodape,
		...content.botoes.map((button) => button.texto),
	];
}

export function buildMessageTemplateParametersFromContent(content: TMessageTemplateContent): TMessageTemplateParameter[] {
	const existingById = new Map(content.corpo.parametros.map((parameter) => [parameter.identificadorInterno, parameter]));
	const detectedVariables = extractMessageTemplateVariables(getMessageTemplateVariableSources(content));

	return detectedVariables.map((identificadorInterno, index) => {
		const existing = existingById.get(identificadorInterno);
		return {
			identificadorInterno,
			identificadorExterno: String(index + 1),
			exemplo: existing?.exemplo || getDefaultMessageTemplateVariableExample(identificadorInterno),
		};
	});
}

export function normalizeMessageTemplateContentParameters(content: TMessageTemplateContent): TMessageTemplateContent {
	return {
		...content,
		corpo: {
			...content.corpo,
			parametros: buildMessageTemplateParametersFromContent(content),
		},
	};
}

export function replaceMessageTemplateVariablesWithExamples(text: string, parameters: TMessageTemplateParameter[]) {
	return replaceMessageTemplateVariables(
		text,
		Object.fromEntries(parameters.map((parameter) => [parameter.identificadorInterno, parameter.exemplo || `{{${parameter.identificadorInterno}}}`])),
	);
}

export function replaceMessageTemplateVariables(text: string, values: TMessageTemplateRuntimeValues) {
	const normalizedText = normalizeMessageTemplateVariableTokensInText(text);

	return normalizedText.replace(TEMPLATE_VARIABLE_REGEX, (match, identifier) => {
		const value = values[identifier];
		if (value === null || value === undefined) return match;
		if (value instanceof Date) return value.toISOString();
		return String(value);
	});
}

export function convertInternalVariablesToPositional(text: string, parameters: TMessageTemplateParameter[]) {
	const normalizedText = normalizeMessageTemplateVariableTokensInText(text);
	const positionByInternalId = new Map(parameters.map((parameter, index) => [parameter.identificadorInterno, parameter.identificadorExterno || String(index + 1)]));

	return normalizedText.replace(TEMPLATE_VARIABLE_REGEX, (match, identifier) => {
		const position = positionByInternalId.get(identifier);
		return position ? `{{${position}}}` : match;
	});
}

export function createEmptyMessageTemplateMetadata(): TMessageTemplateMetadata {
	return { porNumeroTelefone: {} };
}
