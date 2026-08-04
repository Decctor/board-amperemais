import { ACCOUNTING_ENTRY_BALANCE_TOLERANCE } from "./accounting-entry-balance";

export type TFinancialTransactionModifierMetadata = {
	origem?: string | null;
	regra?: string | null;
	observacoes?: string | null;
	parametros?: Record<string, unknown> | null;
};

export type TFinancialTransactionValueInput = {
	valor: number;
	valorBase?: number | null;
	valorJuros?: number | null;
	valorMulta?: number | null;
	valorTaxas?: number | null;
	valorDesconto?: number | null;
	modificadoresMetadata?: TFinancialTransactionModifierMetadata | null;
};

export type TFinancialTransactionValue = {
	valor: number;
	valorBase: number;
	valorJuros: number;
	valorMulta: number;
	valorTaxas: number;
	valorDesconto: number;
	modificadoresMetadata: TFinancialTransactionModifierMetadata | null;
};

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFinancialTransactionTotal(
	input: Pick<TFinancialTransactionValueInput, "valorBase" | "valorJuros" | "valorMulta" | "valorTaxas" | "valorDesconto">,
) {
	return roundCurrency(
		(input.valorBase ?? 0) + (input.valorJuros ?? 0) + (input.valorMulta ?? 0) + (input.valorTaxas ?? 0) - (input.valorDesconto ?? 0),
	);
}

function normalizeModifier(value: number | null | undefined) {
	return roundCurrency(value ?? 0);
}

/**
 * Centraliza a equação monetária de um movimento financeiro:
 * base + juros + multa + taxas - desconto = valor.
 *
 * Os campos de modificadores são opcionais para manter compatibilidade com
 * payloads antigos, que informavam apenas `valor`.
 */
export function normalizeFinancialTransactionValue(input: TFinancialTransactionValueInput): TFinancialTransactionValue {
	if (!Number.isFinite(input.valor) || input.valor < 0) {
		throw new Error("O valor da transação financeira precisa ser um número maior ou igual a zero.");
	}

	const hasModifiers = [input.valorBase, input.valorJuros, input.valorMulta, input.valorTaxas, input.valorDesconto].some(
		(value) => value !== undefined && value !== null,
	);
	const juros = normalizeModifier(input.valorJuros);
	const multa = normalizeModifier(input.valorMulta);
	const taxas = normalizeModifier(input.valorTaxas);
	const desconto = normalizeModifier(input.valorDesconto);
	const base = hasModifiers ? normalizeModifier(input.valorBase ?? input.valor + desconto - juros - multa - taxas) : roundCurrency(input.valor);

	for (const [label, value] of [
		["base", base],
		["juros", juros],
		["multa", multa],
		["taxas", taxas],
		["desconto", desconto],
	] as const) {
		if (!Number.isFinite(value) || value < 0) throw new Error(`O valor de ${label} precisa ser maior ou igual a zero.`);
	}

	const computedTotal = calculateFinancialTransactionTotal({
		valorBase: base,
		valorJuros: juros,
		valorMulta: multa,
		valorTaxas: taxas,
		valorDesconto: desconto,
	});
	if (computedTotal < 0 || Math.abs(computedTotal - roundCurrency(input.valor)) > ACCOUNTING_ENTRY_BALANCE_TOLERANCE) {
		throw new Error("Os modificadores monetários precisam fechar o valor total da transação financeira.");
	}

	return {
		valor: roundCurrency(input.valor),
		valorBase: base,
		valorJuros: juros,
		valorMulta: multa,
		valorTaxas: taxas,
		valorDesconto: desconto,
		modificadoresMetadata: input.modificadoresMetadata ?? null,
	};
}
