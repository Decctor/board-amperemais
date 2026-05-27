import { getMessageTemplateDynamicHeaderPreset, type TMessageTemplateDynamicHeaderPresetId } from "./dynamic-presets";

export type TDynamicHeaderApprovalSample = {
	presetId: TMessageTemplateDynamicHeaderPresetId;
	data: Record<string, string>;
	fileName: string;
	mimeType: "image/png";
};

export function buildDynamicHeaderApprovalSample(presetId: TMessageTemplateDynamicHeaderPresetId): TDynamicHeaderApprovalSample {
	const preset = getMessageTemplateDynamicHeaderPreset(presetId);
	if (!preset) {
		throw new Error("Preset de cabeçalho dinâmico não encontrado.");
	}

	return {
		presetId,
		data: preset.buildSampleData(),
		fileName: `${presetId.toLowerCase()}-approval-sample.png`,
		mimeType: "image/png",
	};
}
