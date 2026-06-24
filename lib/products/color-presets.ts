export type TColorPreset = {
	nome: string;
	hex: string;
};

export const COLOR_PRESETS: TColorPreset[] = [
	{ nome: "Preto", hex: "#171717" },
	{ nome: "Branco", hex: "#fafafa" },
	{ nome: "Cinza", hex: "#737373" },
	{ nome: "Vermelho", hex: "#dc2626" },
	{ nome: "Laranja", hex: "#ea580c" },
	{ nome: "Amarelo", hex: "#ffb900" },
	{ nome: "Verde", hex: "#16a34a" },
	{ nome: "Azul", hex: "#24549c" },
	{ nome: "Roxo", hex: "#7c3aed" },
	{ nome: "Rosa", hex: "#db2777" },
	{ nome: "Marrom", hex: "#78350f" },
	{ nome: "Bege", hex: "#d6d3d1" },
];

/** Presets adicionados ao criar eixo "Cores" pelo empty state. */
export const COLOR_AXIS_SEED_PRESETS: TColorPreset[] = COLOR_PRESETS.filter((preset) =>
	["Preto", "Branco", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo", "Bege"].includes(preset.nome),
);

/** Hex para nomes de cor não reconhecidos (muted do design system). */
export const COLOR_UNKNOWN_HEX = "#737373";

const COLOR_PRESET_BY_NORMALIZED_NAME = new Map(COLOR_PRESETS.map((preset) => [normalizeColorName(preset.nome), preset]));

export function normalizeColorName(nome: string) {
	return nome
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "");
}

export function resolveColorHexFromName(nome: string): string | null {
	return COLOR_PRESET_BY_NORMALIZED_NAME.get(normalizeColorName(nome))?.hex ?? null;
}

export function resolveColorPresetFromName(nome: string): TColorPreset | null {
	return COLOR_PRESET_BY_NORMALIZED_NAME.get(normalizeColorName(nome)) ?? null;
}

/** Lowercase digitado → nome canônico do preset; CAPS ou misto → mantém intenção do usuário. */
export function resolveColorDisplayNameFromDraft(input: string, preset: TColorPreset | null) {
	const trimmed = input.trim();
	if (!preset || !/\p{L}/u.test(trimmed)) return trimmed;

	const isAllLowercase = trimmed === trimmed.toLocaleLowerCase("pt-BR");
	const isAllUppercase = trimmed === trimmed.toLocaleUpperCase("pt-BR");

	if (isAllLowercase && !isAllUppercase) return preset.nome;

	return trimmed;
}

export function resolveColorValueFromDraftName(input: string): { nome: string; hex: string } {
	const preset = resolveColorPresetFromName(input);
	const nome = resolveColorDisplayNameFromDraft(input, preset);
	return {
		nome,
		hex: preset?.hex ?? COLOR_UNKNOWN_HEX,
	};
}

export function resolveColorHexForDraftName(nome: string) {
	return resolveColorHexFromName(nome) ?? COLOR_UNKNOWN_HEX;
}

export function buildColorOptionValues(presets: TColorPreset[]) {
	return presets.map((preset, index) => ({
		referenciaId: crypto.randomUUID(),
		nome: preset.nome,
		valorAuxiliar: preset.hex,
		ordem: index,
	}));
}

export function isColorNameTaken(existingNames: string[], candidateName: string) {
	const normalized = normalizeColorName(candidateName);
	return existingNames.some((name) => normalizeColorName(name) === normalized);
}
