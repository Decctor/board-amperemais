import { formatToPhone } from "../formatting";

export function formatPhoneAsWhatsappId(phone: string) {
	const onlyNumbers = phone.replace(/[^0-9]/g, "");
	return `55${onlyNumbers}`;
}
export function formatWhatsappIdAsPhone(whatsappId: string) {
	const stringWithoutCountryCode = whatsappId.replace(/^55/, "");
	return formatToPhone(stringWithoutCountryCode);
}

/**
 * Sanitizes a string to be used as a WhatsApp template parameter.
 * WhatsApp template parameters cannot have:
 * - Newline characters (\n)
 * - Tab characters (\t)
 * - More than 4 consecutive spaces
 *
 * @param text The text to sanitize
 * @returns The sanitized text
 */
export function sanitizeTemplateParameter(text: string): string {
	if (!text) return "";

	return text
		.replace(/[\n\r\t]+/g, " ") // Replace newlines, carriage returns and tabs with a single space
		.replace(/\s{4,}/g, "   ") // Replace 4 or more consecutive spaces with 3 spaces
		.trim();
}
