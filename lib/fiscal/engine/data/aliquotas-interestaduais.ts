import { REGIAO_NORTE_NORDESTE_CENTRO_OESTE_ES } from "./uf";

// Aliquota interestadual de ICMS aplicavel a operacao entre UFs.
// Regras gerais (sem considerar protocolos especificos de ST):
// - Mercadoria importada (ou com conteudo de importacao superior a 40%): 4% (Resolucao SF 13/2012).
// - Origem nas regioes Sul/Sudeste (exceto ES) com destino Norte/Nordeste/Centro-Oeste/ES: 7%.
// - Demais operacoes interestaduais: 12%.
export function aliquotaInterestadual({
	ufOrigem,
	ufDestino,
	importada,
}: {
	ufOrigem: string;
	ufDestino: string;
	importada: boolean;
}): number {
	if (importada) return 4;

	const origemSulSudeste = !REGIAO_NORTE_NORDESTE_CENTRO_OESTE_ES.has(ufOrigem.toUpperCase());
	const destinoNorteNordesteCentroOesteEs = REGIAO_NORTE_NORDESTE_CENTRO_OESTE_ES.has(ufDestino.toUpperCase());

	if (origemSulSudeste && destinoNorteNordesteCentroOesteEs) return 7;
	return 12;
}
