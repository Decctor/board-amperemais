import type { TFiscalProductOriginEnum } from "@/schemas/enums";

// Codigo IBGE da unidade federativa (cUF na NF-e/NFC-e).
export const UF_TO_IBGE_CODE: Record<string, number> = {
	AC: 12,
	AL: 27,
	AM: 13,
	AP: 16,
	BA: 29,
	CE: 23,
	DF: 53,
	ES: 32,
	GO: 52,
	MA: 21,
	MG: 31,
	MS: 50,
	MT: 51,
	PA: 15,
	PB: 25,
	PE: 26,
	PI: 22,
	PR: 41,
	RJ: 33,
	RN: 24,
	RO: 11,
	RR: 14,
	RS: 43,
	SC: 42,
	SE: 28,
	SP: 35,
	TO: 17,
};

// Regioes usadas para a regra de aliquota interestadual.
export const REGIAO_NORTE_NORDESTE_CENTRO_OESTE_ES = new Set([
	"AC",
	"AL",
	"AM",
	"AP",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MS",
	"MT",
	"PA",
	"PB",
	"PE",
	"PI",
	"RN",
	"RO",
	"RR",
	"SE",
	"TO",
]);

// Mapeia o enum de origem da mercadoria para o codigo numerico (orig) usado no XML / JSON da Nuvem Fiscal.
const ORIGEM_TO_CODIGO: Record<TFiscalProductOriginEnum, number> = {
	NACIONAL: 0,
	ESTRANGEIRA_IMPORTACAO_DIRETA: 1,
	ESTRANGEIRA_ADQUIRIDA_BRASIL: 2,
	NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40: 3,
	NACIONAL_PROCESSOS_BASICOS: 4,
	NACIONAL_CONTEUDO_IMPORTACAO_INFERIOR_IGUAL_40: 5,
	ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR: 6,
	ESTRANGEIRA_ADQUIRIDA_BRASIL_SEM_SIMILAR: 7,
};

export function mapOrigemToCodigo(origem: TFiscalProductOriginEnum): number {
	return ORIGEM_TO_CODIGO[origem] ?? 0;
}

// Origens consideradas importadas para fins de aliquota interestadual de 4% (Resolucao SF 13/2012)
// e selecao da aliquota federal de importados na tabela IBPT.
const ORIGENS_IMPORTADAS = new Set<TFiscalProductOriginEnum>([
	"ESTRANGEIRA_IMPORTACAO_DIRETA",
	"ESTRANGEIRA_ADQUIRIDA_BRASIL",
	"NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40",
	"ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR",
	"ESTRANGEIRA_ADQUIRIDA_BRASIL_SEM_SIMILAR",
]);

export function isOrigemImportada(origem: TFiscalProductOriginEnum): boolean {
	return ORIGENS_IMPORTADAS.has(origem);
}
