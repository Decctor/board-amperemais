import { formatStringAsOnlyDigits, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { isValidCNPJ, isValidCPF } from "@/lib/validation";

export type TClientSearchIntent = { kind: "name"; nome: string } | { kind: "phone"; telefone: string } | { kind: "cpf_cnpj"; cpfCnpj: string };

export function parseClientSearchIntent(search: string): TClientSearchIntent {
	const normalizedSearch = search.trim();

	if (/\p{L}/u.test(normalizedSearch)) {
		return { kind: "name", nome: normalizedSearch };
	}

	const digits = formatStringAsOnlyDigits(normalizedSearch);

	if (digits.length === 14 || isValidCNPJ(digits)) {
		return { kind: "cpf_cnpj", cpfCnpj: formatToCPForCNPJ(digits) };
	}

	if (digits.length === 11 && isValidCPF(digits)) {
		return { kind: "cpf_cnpj", cpfCnpj: formatToCPForCNPJ(digits) };
	}

	if (digits.length > 0) {
		return { kind: "phone", telefone: formatToPhone(digits) };
	}

	return { kind: "name", nome: normalizedSearch };
}

export function getClientSearchIntentLabel(kind: TClientSearchIntent["kind"]): string {
	switch (kind) {
		case "name":
			return "Nenhum cliente com esse nome. Crie um novo cadastro:";
		case "phone":
			return "Nenhum cliente com esse telefone. Crie um novo cadastro:";
		case "cpf_cnpj":
			return "Nenhum cliente com esse CPF/CNPJ. Crie um novo cadastro:";
	}
}
