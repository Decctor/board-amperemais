// Pares de saida em que o sufixo muda entre intra e interestadual: 5405 (venda de mercadoria
// sujeita a ST, contribuinte substituido) tem par interestadual 6404 — "6405" e "5404" nao
// existem na tabela CFOP.
const SUFIXO_SAIDA_INTRA_TO_INTER: Record<string, string> = { "405": "404" };
const SUFIXO_SAIDA_INTER_TO_INTRA: Record<string, string> = { "404": "405" };

// Resolve o CFOP de um item ajustando o digito geografico (5 = intraestadual, 6 = interestadual)
// a partir de um CFOP base configurado no perfil do produto, na regra ou na operacao.
// CFOPs de exterior (7xxx/3xxx) ou invalidos sao retornados normalizados (apenas digitos).
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
		const sufixo = digits.slice(1, 4);
		if (isInterestadual) return `6${SUFIXO_SAIDA_INTRA_TO_INTER[sufixo] ?? sufixo}`;
		return `5${SUFIXO_SAIDA_INTER_TO_INTRA[sufixo] ?? sufixo}`;
	}
	if (primeiroDigito === "1" || primeiroDigito === "2") {
		return `${isInterestadual ? "2" : "1"}${digits.slice(1, 4)}`;
	}

	return digits.slice(0, 4);
}
