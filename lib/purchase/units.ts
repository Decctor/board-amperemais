/**
 * Unidades comerciais na importação de nota fiscal.
 *
 * O fornecedor fatura na unidade dele (CX, FD, PCT) e o catálogo estoca na sua (UN, KG). Sem
 * conversão, uma nota de "10 CX" entra como 10 unidades e o estoque nasce errado, em silêncio.
 * O fator responde "quantas unidades internas cabem em 1 unidade do fornecedor", e a conversão
 * preserva o total: quantidade × fator, valor unitário ÷ fator.
 */

/** Sinônimos comuns de unidade comercial em documentos brasileiros. */
const UNIT_ALIASES: Record<string, string> = {
	UN: "UN",
	UND: "UN",
	UNID: "UN",
	UNIDADE: "UN",
	PC: "PC",
	PCS: "PC",
	PÇ: "PC",
	PECA: "PC",
	PEÇA: "PC",
	CX: "CX",
	CAIXA: "CX",
	KG: "KG",
	KGS: "KG",
	QUILO: "KG",
	G: "G",
	GR: "G",
	L: "L",
	LT: "L",
	LTS: "L",
	LITRO: "L",
	ML: "ML",
	M: "M",
	MT: "M",
	MTS: "M",
	METRO: "M",
	M2: "M2",
	M3: "M3",
	CM: "CM",
	RL: "RL",
	ROLO: "RL",
	PT: "PT",
	PCT: "PT",
	PACOTE: "PT",
	FD: "FD",
	FARDO: "FD",
	CJ: "CJ",
	CONJ: "CJ",
	CONJUNTO: "CJ",
	KIT: "KIT",
	PAR: "PAR",
	SC: "SC",
	SACO: "SC",
	DZ: "DZ",
	DUZIA: "DZ",
};

export function normalizeUnit(unit?: string | null) {
	const cleaned = (unit ?? "")
		.trim()
		.toUpperCase()
		.replace(/[^\p{L}\p{N}]/gu, "");
	if (!cleaned) return null;
	return UNIT_ALIASES[cleaned] ?? cleaned;
}

/** Sem informação de um dos lados não há divergência a acusar: não inventamos alerta. */
export function unitsAreEquivalent(documentUnit?: string | null, productUnit?: string | null) {
	const normalizedDocument = normalizeUnit(documentUnit);
	const normalizedProduct = normalizeUnit(productUnit);
	if (!normalizedDocument || !normalizedProduct) return true;
	return normalizedDocument === normalizedProduct;
}

/**
 * Tenta ler o tamanho da embalagem na própria descrição ("CX 12", "CAIXA C/ 24", "FD X 6").
 * É apenas uma sugestão para poupar digitação: quem confirma o fator é o operador.
 */
export function inferPackFactorFromDescription(descricao: string): number | null {
	const patterns = [
		/(?:CX|CAIXA|PCT|PACOTE|FARDO|FD|CJ|CONJUNTO|DZ|DUZIA)\s*(?:C\/|COM|X|\/)?\s*(\d{1,4})\b/i,
		/\b(\d{1,4})\s*(?:UN|UND|UNID|UNIDADES?|PC|PCS|PE[ÇC]AS?)\b/i,
	];
	for (const pattern of patterns) {
		const match = descricao.match(pattern);
		const parsed = match?.[1] ? Number(match[1]) : Number.NaN;
		if (Number.isFinite(parsed) && parsed > 1) return parsed;
	}
	return null;
}

/**
 * Converte a linha lida do documento para a unidade interna do produto. O fator não altera o total
 * da linha, apenas redistribui quantidade e valor unitário entre as duas unidades.
 */
export function convertLineToProductUnit({
	quantidade,
	valorUnitario,
	fatorConversao,
}: {
	quantidade: number;
	valorUnitario: number;
	fatorConversao?: number | null;
}) {
	const fator = fatorConversao && fatorConversao > 0 ? fatorConversao : 1;
	return { quantidade: quantidade * fator, valorUnitario: valorUnitario / fator };
}
