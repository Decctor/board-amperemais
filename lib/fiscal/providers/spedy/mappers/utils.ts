import type { TFiscalOperationConsumerPresenceEnum, TFiscalOperationFinalityEnum, TFiscalTaxRuleScopeEnum } from "@/schemas/enums";

export function onlyDigits(value: string | null | undefined) {
	return value?.replace(/\D/g, "") || undefined;
}

export function nonEmptyString(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

const NFE_TEXT_REPLACEMENTS: Record<string, string> = {
	"‘": "'",
	"’": "'",
	"“": '"',
	"”": '"',
	"–": "-",
	"—": "-",
};

/**
 * Normaliza texto livre para o conjunto de caracteres aceito pelos campos String do XML da
 * NF-e/NFC-e. Mantem caracteres latinos usados em nomes brasileiros, converte pontuacao Unicode
 * comum e remove emoji, caracteres de controle e outros simbolos fora do Latin-1.
 */
export function sanitizeNfeText(value: string | null | undefined, maxLength?: number) {
	if (!value) return undefined;

	let sanitized = "";
	for (const character of value.normalize("NFC")) {
		const replacement = NFE_TEXT_REPLACEMENTS[character] ?? character;
		if (/\s/u.test(replacement)) {
			sanitized += " ";
			continue;
		}
		for (const candidate of replacement) {
			if (/[\x21-\x7E\u00A1-\u00FF]/u.test(candidate)) sanitized += candidate;
		}
	}

	const compact = sanitized.replace(/\s+/gu, " ").trim();
	if (!compact) return undefined;
	return maxLength ? Array.from(compact).slice(0, maxLength).join("").trim() || undefined : compact;
}

export function formatNcm(value: string | null | undefined) {
	const digits = onlyDigits(value) ?? "";
	if (digits.length === 2 || digits.length === 8) return digits;
	if (digits.length > 2 && digits.length < 8) return digits.padStart(8, "0");
	if (digits.length > 8) return digits.slice(0, 8);
	return "00000000";
}

export function formatCest(value: string | null | undefined) {
	const digits = onlyDigits(value);
	if (!digits) return undefined;
	if (digits.length === 7) return digits;
	if (digits.length < 7) return digits.padStart(7, "0");
	return undefined;
}

export function mapTaxRegistration(value: string | null | undefined) {
	const trimmed = nonEmptyString(value);
	if (!trimmed) return undefined;
	if (trimmed.toUpperCase() === "ISENTO") return "ISENTO";
	return onlyDigits(trimmed);
}

export function resolveFiscalItemName(metadata: unknown, fallback: string) {
	if (!metadata || typeof metadata !== "object") return fallback;
	const values = metadata as { nome?: unknown; descricao?: unknown };
	for (const value of [values.nome, values.descricao]) {
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return fallback;
}

export function mapPurposeType(finalidade: TFiscalOperationFinalityEnum) {
	switch (finalidade) {
		case "COMPLEMENTAR":
			return "complement";
		case "AJUSTE":
			return "adjustment";
		case "DEVOLUCAO":
			return "devolution";
		case "NORMAL":
		default:
			return "normal";
	}
}

export function mapPresenceType(presenca: TFiscalOperationConsumerPresenceEnum) {
	switch (presenca) {
		case "NAO_SE_APLICA":
			return "none";
		case "OPERACAO_PRESENCIAL":
			return "presence";
		case "INTERNET":
			return "internet";
		case "TELEATENDIMENTO":
			return "telephone";
		case "ENTREGA_DOMICILIO":
			return "delivery";
	}
}

export function mapDestinationType(escopo: TFiscalTaxRuleScopeEnum) {
	if (escopo === "INTERESTADUAL") return "interstate";
	return "internal";
}

export function buildSpedyIntegrationId(reference: string) {
	if (reference.length <= 36) return reference;
	let hash = 0;
	for (let index = 0; index < reference.length; index++) {
		hash = (hash * 31 + reference.charCodeAt(index)) >>> 0;
	}
	return `${reference.slice(0, 27)}-${hash.toString(16).padStart(8, "0")}`;
}
