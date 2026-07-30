/**
 * Rede de segurança da faixa de preço na consulta de catálogo.
 *
 * O contrato da ferramenta é a defesa principal: `faixaPreco` é um objeto aninhado com
 * `origem: "PEDIDA_PELO_CLIENTE"` obrigatório, justamente para que preenchê-lo seja um ato
 * deliberado e não o reflexo de completar todo campo numérico que aparece no schema.
 *
 * Esta camada existe porque o reflexo era massivo: nos testes de julho/2026, 56 de 57 chamadas
 * vinham com faixa inventada (`0/0`, `0.03`, `1000000`), e um `precoMax: 0` fazia o agente
 * afirmar ao cliente que a empresa não vendia chuveiros — havia 45 no catálogo. Se, com o
 * contrato novo, `faixaPrecoIgnorada` parar de aparecer nos runs, esta função pode virar
 * somente telemetria.
 */

export type TProductPriceRange = {
	min?: number;
	max?: number;
	origem: "PEDIDA_PELO_CLIENTE";
};

export type TProductQueryInput = {
	termo?: string;
	grupo?: string;
	faixaPreco?: TProductPriceRange;
	apenasAtivos?: boolean;
	limite?: number;
	visao?: "LISTA" | "GRUPOS";
};

export type TNormalizedProductQuery = {
	input: TProductQueryInput;
	/** True quando a faixa foi descartada por não haver pedido do cliente que a justifique. */
	faixaPrecoIgnorada: boolean;
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

/**
 * Descarta a faixa de preço quando nenhuma das mensagens recentes do cliente a justifica.
 *
 * A janela é de várias mensagens, e não só da última, porque o pedido e a cobrança vêm em
 * turnos separados: "quero até 500 reais" seguido de "quais são?" — na segunda mensagem a
 * faixa continua valendo, e olhar apenas a última a descartaria indevidamente.
 */
export function normalizeProductQueryInput(input: TProductQueryInput, recentClientMessages: string[]): TNormalizedProductQuery {
	const normalizedInput: TProductQueryInput = {
		...input,
		termo: trimOptional(input.termo),
		grupo: trimOptional(input.grupo),
	};

	if (!input.faixaPreco) return { input: normalizedInput, faixaPrecoIgnorada: false };

	if (!recentClientMessages.some(hasExplicitPriceRange)) {
		return { input: { ...normalizedInput, faixaPreco: undefined }, faixaPrecoIgnorada: true };
	}

	// O schema da ferramenta já exige valores positivos e min <= max; aqui só sobra a limpeza de
	// valores não finitos, que nenhum `.positive()` pega.
	const min = Number.isFinite(input.faixaPreco.min) ? input.faixaPreco.min : undefined;
	const max = Number.isFinite(input.faixaPreco.max) ? input.faixaPreco.max : undefined;
	if (min === undefined && max === undefined) {
		return { input: { ...normalizedInput, faixaPreco: undefined }, faixaPrecoIgnorada: true };
	}

	return { input: { ...normalizedInput, faixaPreco: { ...input.faixaPreco, min, max } }, faixaPrecoIgnorada: false };
}
