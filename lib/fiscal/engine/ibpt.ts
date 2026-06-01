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
};

function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

// Seleciona a taxa IBPT por NCM + UF. Tenta correspondencia exata e, em seguida, por prefixo de NCM
// mais longo (alguns NCMs sao informados por capitulo/posicao na tabela).
export function selectIbptRate(rates: TIbptRate[], { ncm, uf }: { ncm: string; uf: string }): TIbptRate | null {
	const targetNcm = onlyDigits(ncm);
	const targetUf = uf.toUpperCase();
	const sameUf = rates.filter((rate) => rate.uf.toUpperCase() === targetUf);
	if (sameUf.length === 0 || !targetNcm) return null;

	const exact = sameUf.find((rate) => onlyDigits(rate.ncm) === targetNcm);
	if (exact) return exact;

	const byPrefix = sameUf
		.filter((rate) => {
			const rateNcm = onlyDigits(rate.ncm);
			return targetNcm.startsWith(rateNcm) || rateNcm.startsWith(targetNcm);
		})
		.sort((a, b) => onlyDigits(b.ncm).length - onlyDigits(a.ncm).length);

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
