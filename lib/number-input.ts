const INVALID_NUMBER_INPUT_CHARACTERS = /[^0-9,.-]/g;

export function sanitizeNumberInputText(value: string) {
	const allowedCharacters = value.replace(INVALID_NUMBER_INPUT_CHARACTERS, "");
	const isNegative = allowedCharacters.startsWith("-");
	const unsignedValue = allowedCharacters.replaceAll("-", "");
	return `${isNegative ? "-" : ""}${unsignedValue}`;
}

export function parseNumberInputText(value: string): number | null {
	const sanitizedValue = sanitizeNumberInputText(value);
	if (!/\d/.test(sanitizedValue)) return null;

	const isNegative = sanitizedValue.startsWith("-");
	const unsignedValue = sanitizedValue.replace("-", "");
	const lastCommaIndex = unsignedValue.lastIndexOf(",");
	const lastDotIndex = unsignedValue.lastIndexOf(".");
	const decimalSeparatorIndex = Math.max(lastCommaIndex, lastDotIndex);
	const integerPart = (decimalSeparatorIndex >= 0 ? unsignedValue.slice(0, decimalSeparatorIndex) : unsignedValue).replace(/[,.]/g, "") || "0";
	const decimalPart = decimalSeparatorIndex >= 0 ? unsignedValue.slice(decimalSeparatorIndex + 1).replace(/[,.]/g, "") : "";
	const normalizedValue = `${isNegative ? "-" : ""}${integerPart}${decimalSeparatorIndex >= 0 ? `.${decimalPart}` : ""}`;
	const numericValue = Number(normalizedValue);

	return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatNumberInputValue(value: number | null | undefined) {
	if (value === null || value === undefined) return "";
	return value.toString().replace(".", ",");
}
