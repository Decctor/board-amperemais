import type { TRedemptionLimit } from "../types";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";

type TClientLookUp = {
	saldoValorDisponivel: number;
	programa?: {
		terminologia?: TCashbackProgramTerminologyEnum | null;
		resgateLimiteTipo: string | null;
		resgateLimiteValor: number | null;
		acumuloPermitirViaPontoIntegracao: boolean;
		acumuloPermitirViaIntegracao: boolean;
	} | null;
};
export function getCashbackAccumulationConfig(saldos: TClientLookUp[] | undefined | null): {
	acumuloPermitirViaPontoIntegracao: boolean;
	acumuloPermitirViaIntegracao: boolean;
} {
	return {
		acumuloPermitirViaPontoIntegracao: saldos?.[0]?.programa?.acumuloPermitirViaPontoIntegracao ?? false,
		acumuloPermitirViaIntegracao: saldos?.[0]?.programa?.acumuloPermitirViaIntegracao ?? false,
	};
}

export function getAvailableCashback(saldos: TClientLookUp[] | undefined | null): number {
	return saldos?.[0]?.saldoValorDisponivel ?? 0;
}

export function getRedemptionLimitConfig(saldos: TClientLookUp[] | undefined | null): TRedemptionLimit {
	const programa = saldos?.[0]?.programa;
	return {
		terminologia: programa?.terminologia ?? "DINHEIRO",
		tipo: programa?.resgateLimiteTipo ?? null,
		valor: programa?.resgateLimiteValor ?? null,
	};
}

export function getMaxCashbackToUse(available: number, saleValue: number, limitConfig: TRedemptionLimit): number {
	let maxByLimit = saleValue;
	if (limitConfig.tipo && limitConfig.valor !== null) {
		if (limitConfig.tipo === "FIXO") {
			maxByLimit = limitConfig.valor;
		} else if (limitConfig.tipo === "PERCENTUAL") {
			maxByLimit = (saleValue * limitConfig.valor) / 100;
		}
	}
	return Math.min(available, saleValue, maxByLimit);
}

export function getFinalValue(saleValue: number, cashback: { aplicar: boolean; valor: number }): number {
	return Math.max(0, saleValue - (cashback.aplicar ? cashback.valor : 0));
}
