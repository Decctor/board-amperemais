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

/**
 * Validates a value as either a CPF (11 digits) or CNPJ (14 digits),
 * including verification digits. Any other length is invalid.
 * @param value - The document string to validate (can include formatting characters)
 */
export function isValidCpfCnpj(value: string): boolean {
	const digits = value.replace(/\D/g, "");
	if (digits.length === 11) return isValidCPF(digits);
	if (digits.length === 14) return isValidCNPJ(digits);
	return false;
}

/**
 * Validates a Brazilian CPF (Cadastro de Pessoas Físicas).
 * @param cpf - The CPF string to validate (can include formatting characters)
 * @returns true if valid, false otherwise
 */
export function isValidCPF(cpf: string): boolean {
	if (!cpf) return false;

	const cleanCPF = cpf.replace(/\D/g, "");
	if (cleanCPF.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

	const calculateVerificationDigit = (length: number) => {
		let sum = 0;
		for (let index = 0; index < length; index++) {
			sum += Number.parseInt(cleanCPF[index]) * (length + 1 - index);
		}

		const remainder = (sum * 10) % 11;
		return remainder === 10 ? 0 : remainder;
	};

	const firstDigit = calculateVerificationDigit(9);
	if (Number.parseInt(cleanCPF[9]) !== firstDigit) return false;

	const secondDigit = calculateVerificationDigit(10);
	return Number.parseInt(cleanCPF[10]) === secondDigit;
}
