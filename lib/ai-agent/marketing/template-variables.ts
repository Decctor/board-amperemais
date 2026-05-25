import { getVariablesForTrigger, MessageTemplateVariables, type TMessageTemplateVariables } from "@/lib/message-templates";
import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";

export type TParsedTemplateVariable = {
	raw: string;
	identificador: string;
};

const VARIABLE_IDENTIFIER_MAP = new Map(MessageTemplateVariables.map((variable) => [variable.value, variable]));
type TVariableIdentifier = keyof TMessageTemplateVariables;

export function parseTemplateVariables(templateText: string): {
	variables: TParsedTemplateVariable[];
	unknownVariables: string[];
} {
	const matches = templateText.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g);
	const variables: TParsedTemplateVariable[] = [];
	const unknownVariables: string[] = [];
	const seen = new Set<string>();

	for (const match of matches) {
		const identificador = match[1];
		if (!identificador || seen.has(identificador)) {
			continue;
		}

		seen.add(identificador);
		if (!VARIABLE_IDENTIFIER_MAP.has(identificador as TVariableIdentifier)) {
			unknownVariables.push(identificador);
			continue;
		}

		variables.push({
			raw: match[0],
			identificador,
		});
	}

	return {
		variables,
		unknownVariables,
	};
}

export function validateTemplateVariablesForTrigger(templateText: string, triggerType: TCampaignTriggerTypeEnum) {
	const { variables, unknownVariables } = parseTemplateVariables(templateText);
	const allowedVariables = new Set(getVariablesForTrigger(triggerType).map((variable) => variable.value));

	const incompatibleVariables = variables
		.map((variable) => variable.identificador)
		.filter((identificador) => !allowedVariables.has(identificador as TVariableIdentifier));

	return {
		valid: unknownVariables.length === 0 && incompatibleVariables.length === 0,
		variables,
		unknownVariables,
		incompatibleVariables,
	};
}
