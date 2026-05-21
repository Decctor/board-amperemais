import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { TMessageTemplateParameter, TMessageTemplateRuntimeValues } from "./types";
import { getDefaultMessageTemplateVariableExample, isAllowedMessageTemplateVariable } from "./variables";

const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractMessageTemplateVariables(sources: Array<string | null | undefined>) {
	const identifiers = new Set<string>();
	for (const source of sources) {
		if (!source) continue;
		for (const match of source.matchAll(TEMPLATE_VARIABLE_REGEX)) {
			if (match[1] && isAllowedMessageTemplateVariable(match[1])) identifiers.add(match[1]);
		}
	}
	return Array.from(identifiers);
}

export function extractUnknownMessageTemplateVariables(sources: Array<string | null | undefined>) {
	const identifiers = new Set<string>();
	for (const source of sources) {
		if (!source) continue;
		for (const match of source.matchAll(TEMPLATE_VARIABLE_REGEX)) {
			if (match[1] && !isAllowedMessageTemplateVariable(match[1])) identifiers.add(match[1]);
		}
	}
	return Array.from(identifiers);
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
	return text.replace(TEMPLATE_VARIABLE_REGEX, (match, identifier) => {
		const value = values[identifier];
		if (value === null || value === undefined) return match;
		if (value instanceof Date) return value.toISOString();
		return String(value);
	});
}

export function convertInternalVariablesToPositional(text: string, parameters: TMessageTemplateParameter[]) {
	const positionByInternalId = new Map(parameters.map((parameter, index) => [parameter.identificadorInterno, parameter.identificadorExterno || String(index + 1)]));
	return text.replace(TEMPLATE_VARIABLE_REGEX, (match, identifier) => {
		const position = positionByInternalId.get(identifier);
		return position ? `{{${position}}}` : match;
	});
}

export function createEmptyMessageTemplateMetadata(): TMessageTemplateMetadata {
	return { porNumeroTelefone: {} };
}
