/**
 * Uma única regra, herdada de `lib/ai/tools/products.ts`: **campo ausente, nunca nulo**.
 *
 * `preco: null` e `quantidade: null` chegam ao modelo como zero, e um zero inventado é a origem
 * do bug em que o agente nega um produto que existe ou reporta faturamento zerado. Sem o campo,
 * não há o que alucinar — ele pergunta ou consulta de novo.
 *
 * O mesmo vale para `NaN` e `Infinity`, que as agregações produzem em período sem venda
 * (`totalItens / totalVendas` com zero vendas). `JSON.stringify` os serializa como `null`,
 * então sem esta passada eles reapareceriam exatamente como o zero que queríamos evitar.
 */
export function sanitizeForModel<T>(value: T): unknown {
	if (value === null || value === undefined) return undefined;

	if (typeof value === "number") return Number.isFinite(value) ? value : undefined;

	if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();

	if (Array.isArray(value)) {
		// Item nulo dentro de lista vira `null` no JSON de qualquer jeito; melhor sumir com ele.
		return value.map((item) => sanitizeForModel(item)).filter((item) => item !== undefined);
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
			const sanitized = sanitizeForModel(entryValue);
			if (sanitized !== undefined) result[key] = sanitized;
		}
		return result;
	}

	return value;
}

/**
 * Arredonda valores monetários e percentuais antes de entregar ao modelo. Um faturamento com
 * doze casas decimais gasta tokens e convida o modelo a repetir a precisão falsa no texto.
 */
export function roundForModel(value: number | null | undefined, decimals = 2) {
	if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}
