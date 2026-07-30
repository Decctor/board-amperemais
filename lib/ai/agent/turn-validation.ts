const DEFERRED_ACTION_PATTERNS = [
	/\b(?:vou|vamos)\s+(?:agora\s+)?(?:consultar|verificar|conferir|criar|gerar|preparar|montar|buscar)\b/i,
	/\b(?:um momento|s[oó] um instante|aguarde)\b/i,
	/\b(?:j[aá]\s+)?(?:te|lhe)\s+(?:envio|mando|retorno)\b/i,
];

export function hasDeferredActionPromise(message: string | null): boolean {
	if (!message?.trim()) return false;
	return DEFERRED_ACTION_PATTERNS.some((pattern) => pattern.test(message));
}

export function shouldRetryDeferredAction(message: string | null, calledTools: string[]): boolean {
	if (!message?.trim() || !hasDeferredActionPromise(message)) return false;
	const promisesQuote = /\b(?:criar|gerar|preparar|montar)\b[^.\n]{0,30}\bor[çc]amento\b|\bor[çc]amento\b[^.\n]{0,30}\b(?:criar|gerar|preparar|montar)\b/i.test(
		message,
	);
	if (promisesQuote) return !calledTools.includes("orcamentos_criar");
	return calledTools.length === 0;
}
