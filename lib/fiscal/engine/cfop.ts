// Resolve o CFOP de um item ajustando o digito geografico (5 = intraestadual, 6 = interestadual)
// a partir de um CFOP base configurado no perfil do produto, na regra ou na operacao.
// CFOPs de exterior (7xxx/3xxx) ou invalidos sao retornados sem alteracao.
export function resolveCfop({
	cfopBase,
	ufOrigem,
	ufDestino,
}: {
	cfopBase: string | null | undefined;
	ufOrigem: string;
	ufDestino: string;
}): string | null {
	if (!cfopBase) return null;
	const digits = cfopBase.replace(/\D/g, "");
	if (digits.length < 4) return cfopBase;

	const isInterestadual = ufOrigem.toUpperCase() !== ufDestino.toUpperCase();
	const primeiroDigito = digits[0];

	// Apenas operacoes de saida internas (5) e interestaduais (6) sao ajustadas geograficamente.
	if (primeiroDigito === "5" || primeiroDigito === "6") {
		const desejado = isInterestadual ? "6" : "5";
		return `${desejado}${digits.slice(1, 4)}`;
	}

	return digits.slice(0, 4);
}
