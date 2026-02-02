export function isEmpty(value: any) {
	return value == null || (typeof value === "string" && value.trim().length === 0);
}

export function isValidNumber(value: unknown) {
	return typeof value === "number" && !Number.isNaN(value) && value !== null && value !== undefined;
}

/**
 * Validates a Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica)
 * @param cnpj - The CNPJ string to validate (can include formatting characters)
 * @returns true if valid, false otherwise
 */
export function isValidCNPJ(cnpj: string): boolean {
	if (!cnpj) return false;

	// Remove all non-digit characters
	const cleanCNPJ = cnpj.replace(/\D/g, "");

	// CNPJ must have exactly 14 digits
	if (cleanCNPJ.length !== 14) return false;

	// Reject known invalid CNPJs (all same digits)
	if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

	// Calculate first verification digit
	let sum = 0;
	let weight = 5;

	for (let i = 0; i < 12; i++) {
		sum += Number.parseInt(cleanCNPJ[i]) * weight;
		weight = weight === 2 ? 9 : weight - 1;
	}

	let remainder = sum % 11;
	const firstDigit = remainder < 2 ? 0 : 11 - remainder;

	if (Number.parseInt(cleanCNPJ[12]) !== firstDigit) return false;

	// Calculate second verification digit
	sum = 0;
	weight = 6;

	for (let i = 0; i < 13; i++) {
		sum += Number.parseInt(cleanCNPJ[i]) * weight;
		weight = weight === 2 ? 9 : weight - 1;
	}

	remainder = sum % 11;
	const secondDigit = remainder < 2 ? 0 : 11 - remainder;

	return Number.parseInt(cleanCNPJ[13]) === secondDigit;
}
