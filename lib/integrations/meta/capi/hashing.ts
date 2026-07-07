/**
 * Hashing de PII para o Conversions API da Meta. A Meta exige SHA-256 em hexadecimal minúsculo
 * sobre os dados normalizados. Usamos a Web Crypto API (disponível no runtime Node 18+/Edge).
 */

async function sha256Hex(value: string): Promise<string> {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/** Normaliza (trim + lowercase) e hasheia. Retorna null se vazio. */
export async function hashNormalized(value: string | null | undefined): Promise<string | null> {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return null;
	return sha256Hex(normalized);
}

/** Normaliza (trim + lowercase) e hasheia um e-mail. Retorna null se vazio. */
export async function hashEmail(email: string | null | undefined): Promise<string | null> {
	return hashNormalized(email);
}

/**
 * Normaliza um telefone para apenas dígitos (com DDI) e hasheia. A Meta recomenda formato E.164
 * sem o `+` nem separadores. Assume BR (adiciona 55 quando ausente e o número tem 10-11 dígitos).
 */
export async function hashPhone(phone: string | null | undefined): Promise<string | null> {
	let digits = phone?.replace(/\D/g, "") ?? "";
	if (!digits) return null;
	if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = `55${digits}`;
	return sha256Hex(digits);
}
