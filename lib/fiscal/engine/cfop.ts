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

	// Saida: 5 (intra) / 6 (inter). Entrada (ex.: devolucao de venda): 1 (intra) / 2 (inter).
	if (primeiroDigito === "5" || primeiroDigito === "6") {
		return `${isInterestadual ? "6" : "5"}${digits.slice(1, 4)}`;
	}
	if (primeiroDigito === "1" || primeiroDigito === "2") {
		return `${isInterestadual ? "2" : "1"}${digits.slice(1, 4)}`;
	}

	return digits.slice(0, 4);
}
