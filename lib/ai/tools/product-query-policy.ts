export type TProductQueryInput = {
	termo?: string;
	grupo?: string;
	precoMin?: number;
	precoMax?: number;
	apenasAtivos?: boolean;
	limite?: number;
	visao?: "LISTA" | "GRUPOS";
};

export type TNormalizedProductQuery = {
	input: TProductQueryInput;
	filtrosIgnorados: Array<"precoMin" | "precoMax">;
};

const PRICE_RANGE_PATTERNS = [
	/\b(?:at[eé]|no m[aá]ximo|por menos de|menos de|abaixo de)\s*(?:r\$\s*)?\d/i,
	/\bentre\s*(?:r\$\s*)?\d[\d.,]*\s*(?:e|a)\s*(?:r\$\s*)?\d/i,
	/\bde\s*(?:r\$\s*)?\d[\d.,]*\s*(?:at[eé]|a)\s*(?:r\$\s*)?\d/i,
	/\b(?:a partir de|acima de|mais de|no m[ií]nimo)\s*(?:r\$\s*)?\d/i,
	/\b(?:faixa|or[çc]amento|tenho|posso gastar)\b[^.\n]{0,30}(?:r\$\s*)?\d/i,
	/\br\$\s*\d/i,
];

export function hasExplicitPriceRange(message: string): boolean {
	const normalized = message.normalize("NFC").trim();
	if (!normalized) return false;
	return PRICE_RANGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function trimOptional(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export function normalizeProductQueryInput(input: TProductQueryInput, latestClientMessage: string): TNormalizedProductQuery {
	const explicitPriceRange = hasExplicitPriceRange(latestClientMessage);
	const filtrosIgnorados: TNormalizedProductQuery["filtrosIgnorados"] = [];
	let precoMin = input.precoMin;
	let precoMax = input.precoMax;

	if (!explicitPriceRange) {
		if (precoMin !== undefined) filtrosIgnorados.push("precoMin");
		if (precoMax !== undefined) filtrosIgnorados.push("precoMax");
		precoMin = undefined;
		precoMax = undefined;
	} else {
		if (precoMin === 0 || (precoMin !== undefined && !Number.isFinite(precoMin))) precoMin = undefined;
		if (precoMax !== undefined && !Number.isFinite(precoMax)) precoMax = undefined;
		if (precoMin !== undefined && precoMax !== undefined && precoMin > precoMax) {
			throw new Error("O preço mínimo não pode ser maior que o preço máximo.");
		}
	}

	return {
		input: {
			...input,
			termo: trimOptional(input.termo),
			grupo: trimOptional(input.grupo),
			precoMin,
			precoMax,
		},
		filtrosIgnorados,
	};
}
