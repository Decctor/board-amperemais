import type { TFiscalOperationConsumerPresenceEnum, TFiscalOperationFinalityEnum } from "@/schemas/enums";

export function onlyDigits(value: string | null | undefined) {
	return value?.replace(/\D/g, "") || undefined;
}

/** Formato da API Nuvem Fiscal: ^([0-9]{2}|[0-9]{8})$ */
export function formatNcmForNuvemFiscal(value: string | null | undefined) {
	const digits = onlyDigits(value) ?? "";
	if (digits.length === 2) return digits;
	if (digits.length === 8) return digits;
	if (digits.length > 2 && digits.length < 8) return digits.padStart(8, "0");
	if (digits.length > 8) return digits.slice(0, 8);
	return "00000000";
}

/** Formato da API Nuvem Fiscal: ^([0-9]{7})$ ; omitido quando vazio ou invalido. */
export function formatCestForNuvemFiscal(value: string | null | undefined) {
	const digits = onlyDigits(value);
	if (!digits) return undefined;
	if (digits.length === 7) return digits;
	if (digits.length < 7) return digits.padStart(7, "0");
	return undefined;
}

export function nonEmptyString(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

export function mapTaxRegistration(value: string | null | undefined) {
	const trimmed = nonEmptyString(value);
	if (!trimmed) return undefined;
	if (trimmed.toUpperCase() === "ISENTO") return "ISENTO";
	return onlyDigits(trimmed);
}

export function mapFiscalFinalityToNfeCode(finalidade: TFiscalOperationFinalityEnum): 1 | 2 | 3 | 4 {
	switch (finalidade) {
		case "NORMAL":
			return 1;
		case "COMPLEMENTAR":
			return 2;
		case "AJUSTE":
			return 3;
		case "DEVOLUCAO":
			return 4;
	}
}

export function mapConsumerPresenceToNfeCode(presenca: TFiscalOperationConsumerPresenceEnum): 0 | 1 | 2 | 3 | 4 {
	switch (presenca) {
		case "NAO_SE_APLICA":
			return 0;
		case "OPERACAO_PRESENCIAL":
			return 1;
		case "INTERNET":
			return 2;
		case "TELEATENDIMENTO":
			return 3;
		case "ENTREGA_DOMICILIO":
			return 4;
	}
}
