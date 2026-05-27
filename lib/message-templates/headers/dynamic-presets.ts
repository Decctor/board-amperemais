import { getDefaultMessageTemplateVariableExample } from "../variables";

export const MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESET_IDS = ["CASHBACK_AVAILABLE_BALANCE"] as const;

export type TMessageTemplateDynamicHeaderPresetId = (typeof MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESET_IDS)[number];

export type TMessageTemplateDynamicHeaderPreset = {
	id: TMessageTemplateDynamicHeaderPresetId;
	label: string;
	description: string;
	requiredVariables: string[];
	requiredRuntimeParams: string[];
	buildSampleData: () => Record<string, string>;
};

export const MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESETS = {
	CASHBACK_AVAILABLE_BALANCE: {
		id: "CASHBACK_AVAILABLE_BALANCE",
		label: "Saldo de cashback",
		description: "Imagem personalizada com logo, cores da loja e saldo disponível do cliente.",
		requiredVariables: ["clientName", "cashbackAvailableBalance"],
		requiredRuntimeParams: ["clientId"],
		buildSampleData: () => ({
			clientName: getDefaultMessageTemplateVariableExample("clientName"),
			cashbackAvailableBalance: getDefaultMessageTemplateVariableExample("cashbackAvailableBalance"),
			label: "Saldo pronto para resgate",
		}),
	},
} satisfies Record<TMessageTemplateDynamicHeaderPresetId, TMessageTemplateDynamicHeaderPreset>;

export const MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESET_OPTIONS = Object.values(MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESETS);

export function getMessageTemplateDynamicHeaderPreset(presetId: string): TMessageTemplateDynamicHeaderPreset | null {
	if (MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESET_IDS.includes(presetId as TMessageTemplateDynamicHeaderPresetId)) {
		return MESSAGE_TEMPLATE_DYNAMIC_HEADER_PRESETS[presetId as TMessageTemplateDynamicHeaderPresetId];
	}
	return null;
}
