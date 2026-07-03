import type { TFiscalProductOriginEnum } from "@/schemas/enums";
import { isOrigemImportada } from "./data/uf";

// Subconjunto de campos da tabela IBPT necessario para calcular o vTotTrib.
export type TIbptRate = {
	ncm: string;
	uf: string;
	aliqNacionalFederal: number;
	aliqImportadosFederal: number;
	aliqEstadual: number;
	aliqMunicipal: number;
	exTipi?: string | null;
	descricao?: string | null;
	versao?: string | null;
	vigenciaInicio?: Date | string | null;
	vigenciaFim?: Date | string | null;
	chave?: string | null;
	fonte?: string | null;
};

function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined): string {
	return (value ?? "").trim().toUpperCase();
}

function normalizeDateValue(value: Date | string | null | undefined): number {
	if (!value) return 0;
	const date = value instanceof Date ? value : new Date(value);
	const time = date.getTime();
	return Number.isFinite(time) ? time : 0;
}

function compareNumbersAsc(a: number, b: number): number {
	return a === b ? 0 : a < b ? -1 : 1;
}

function getRateTotal(rate: TIbptRate): number {
	return rate.aliqNacionalFederal + rate.aliqEstadual + rate.aliqMunicipal;
}

function compareIbptRates(a: TIbptRate, b: TIbptRate, targetExTipi?: string | null): number {
	const aNcm = onlyDigits(a.ncm);
	const bNcm = onlyDigits(b.ncm);
	const byNcmLength = bNcm.length - aNcm.length;
	if (byNcmLength !== 0) return byNcmLength;

	const normalizedTargetExTipi = normalizeText(targetExTipi);
	if (normalizedTargetExTipi) {
		const aMatchesExTipi = normalizeText(a.exTipi) === normalizedTargetExTipi;
		const bMatchesExTipi = normalizeText(b.exTipi) === normalizedTargetExTipi;
		const byExTipiMatch = Number(bMatchesExTipi) - Number(aMatchesExTipi);
		if (byExTipiMatch !== 0) return byExTipiMatch;
	}

	// Linhas sem EX TIPI sao a regra geral; se houver EX TIPI sem correspondencia explicita do
	// produto, a linha geral deve vencer.
	const byExTipiPresence = Number(Boolean(a.exTipi)) - Number(Boolean(b.exTipi));
	if (byExTipiPresence !== 0) return byExTipiPresence;

	const byVigenciaInicio = normalizeDateValue(b.vigenciaInicio) - normalizeDateValue(a.vigenciaInicio);
	if (byVigenciaInicio !== 0) return byVigenciaInicio;

	const byVigenciaFim = normalizeDateValue(b.vigenciaFim) - normalizeDateValue(a.vigenciaFim);
	if (byVigenciaFim !== 0) return byVigenciaFim;

	const byTotal = compareNumbersAsc(getRateTotal(a), getRateTotal(b));
	if (byTotal !== 0) return byTotal;

	const byFederal = compareNumbersAsc(a.aliqNacionalFederal, b.aliqNacionalFederal);
	if (byFederal !== 0) return byFederal;

	const byImportados = compareNumbersAsc(a.aliqImportadosFederal, b.aliqImportadosFederal);
	if (byImportados !== 0) return byImportados;

	const byEstadual = compareNumbersAsc(a.aliqEstadual, b.aliqEstadual);
	if (byEstadual !== 0) return byEstadual;

	const byMunicipal = compareNumbersAsc(a.aliqMunicipal, b.aliqMunicipal);
	if (byMunicipal !== 0) return byMunicipal;

	return [
		normalizeText(a.descricao).localeCompare(normalizeText(b.descricao)),
		normalizeText(a.chave).localeCompare(normalizeText(b.chave)),
		normalizeText(a.versao).localeCompare(normalizeText(b.versao)),
		normalizeText(a.fonte).localeCompare(normalizeText(b.fonte)),
	].find((result) => result !== 0) ?? 0;
}

// Seleciona a taxa IBPT por NCM + UF. Tenta correspondencia exata e, em seguida, o prefixo mais
// longo em que o NCM da tabela e mais generico que o alvo (capitulo/posicao). Nao aceita o inverso
// (taxa de NCM mais especifico que o alvo), que casaria com um item arbitrario do capitulo.
export function selectIbptRate(rates: TIbptRate[], { ncm, uf, exTipi }: { ncm: string; uf: string; exTipi?: string | null }): TIbptRate | null {
	const targetNcm = onlyDigits(ncm);
	const targetUf = uf.toUpperCase();
	const sameUf = rates.filter((rate) => rate.uf.toUpperCase() === targetUf);
	if (sameUf.length === 0 || !targetNcm) return null;

	const exact = sameUf.filter((rate) => onlyDigits(rate.ncm) === targetNcm).sort((a, b) => compareIbptRates(a, b, exTipi))[0];
	if (exact) return exact;

	const byPrefix = sameUf
		.filter((rate) => {
			const rateNcm = onlyDigits(rate.ncm);
			return rateNcm.length > 0 && rateNcm.length < targetNcm.length && targetNcm.startsWith(rateNcm);
		})
		.sort((a, b) => compareIbptRates(a, b, exTipi));

	return byPrefix[0] ?? null;
}

// Valor aproximado dos tributos (Lei 12.741) = base x (federal + estadual + municipal) / 100.
// A parcela federal usa a aliquota de importados quando a origem da mercadoria e importada.
export function computeVTotTrib({
	rate,
	origem,
	baseValue,
}: {
	rate: TIbptRate | null;
	origem: TFiscalProductOriginEnum;
	baseValue: number;
}): number {
	if (!rate) return 0;
	const federal = isOrigemImportada(origem) ? rate.aliqImportadosFederal : rate.aliqNacionalFederal;
	const total = federal + rate.aliqEstadual + rate.aliqMunicipal;
	return Math.round((((baseValue * total) / 100) + Number.EPSILON) * 100) / 100;
}
