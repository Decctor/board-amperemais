import type { TMessageTemplateContent } from "@/schemas/message-templates";
import type { TMessageTemplateParameter, TMessageTemplateRuntimeValues } from "./types";
import { getDefaultMessageTemplateVariableExample, isAllowedMessageTemplateVariable, MessageTemplateNativeVariables } from "./variables";

const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const TEMPLATE_VARIABLE_TOKEN_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;
const MENTION_SPAN_REGEX = /<span[^>]*data-type=["']mention["'][^>]*>[\s\S]*?<\/span>/gi;
const POSITIONAL_VARIABLE_REGEX = /\{\{\s*(\d+)\s*\}\}/g;

export function replaceMessageTemplateMentionSpansWithVariables(text: string) {
	return text.replace(MENTION_SPAN_REGEX, (match) => {
		const dataIdMatch = match.match(/data-id=["']([^"']+)["']/i);
		if (dataIdMatch?.[1]) return `{{${dataIdMatch[1]}}}`;

		const dataLabelMatch = match.match(/data-label=["']([^"']+)["']/i);
		if (dataLabelMatch?.[1] && isAllowedMessageTemplateVariable(dataLabelMatch[1])) return `{{${dataLabelMatch[1]}}}`;

		return match;
	});
}

export function buildMessageTemplateMentionSpan(identificadorInterno: string) {
	const variable = MessageTemplateNativeVariables.find((item) => item.identificador === identificadorInterno);
	const label = variable?.label.toUpperCase() ?? identificadorInterno;
	return `<span data-type="mention" class="mention" data-id="${identificadorInterno}" data-label="${identificadorInterno}" data-mention-suggestion-char="{">{{${label}}}</span>`;
}

export function extractOrderedMessageTemplatePositions(text: string) {
	const positions: number[] = [];
	const seen = new Set<number>();

	for (const match of text.matchAll(POSITIONAL_VARIABLE_REGEX)) {
		const position = Number(match[1]);
		if (seen.has(position)) continue;
		seen.add(position);
		positions.push(position);
	}

	return positions.sort((left, right) => left - right);
}

export function replaceMessageTemplatePositionsWithMentions(text: string, identifiersByExternalId: Map<string, string>) {
	return text.replace(POSITIONAL_VARIABLE_REGEX, (match, positionValue) => {
		const identificadorInterno = identifiersByExternalId.get(positionValue.trim());
		return identificadorInterno ? buildMessageTemplateMentionSpan(identificadorInterno) : match;
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

/**
 * Resolve o valor de exibição de um token de variável ({{token}}) para previews:
 * com `values` usa o valor de runtime; sem, usa o exemplo do parâmetro (aceitando
 * identificador interno, label ou posição externa como "1"). Retorna null se não resolver.
 */
export function resolveMessageTemplateVariablePreviewValue({
	token,
	parameters,
	values,
}: {
	token: string;
	parameters: TMessageTemplateParameter[];
	values?: TMessageTemplateRuntimeValues;
}) {
	const identifier = resolveMessageTemplateVariableToken(token) ?? token.trim();

	if (values) {
		const value = values[identifier];
		if (value === null || value === undefined) return null;
		if (value instanceof Date) return value.toISOString();
		return String(value);
	}

	const parameter =
		parameters.find((item) => item.identificadorInterno === identifier) ?? parameters.find((item) => item.identificadorExterno === identifier);
	return parameter?.exemplo || null;
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
	const positionByInternalId = new Map(
		parameters.map((parameter, index) => [parameter.identificadorInterno, parameter.identificadorExterno || String(index + 1)]),
	);

	return normalizedText.replace(TEMPLATE_VARIABLE_REGEX, (match, identifier) => {
		const position = positionByInternalId.get(identifier);
		return position ? `{{${position}}}` : match;
	});
}
