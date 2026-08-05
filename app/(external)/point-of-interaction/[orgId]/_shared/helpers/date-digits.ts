/**
 * Datas digitadas em teclado numérico (DDMMAAAA) no ponto de interação.
 *
 * O balcão não tem seletor de calendário: tanto o quiosque (VirtualKeyboard) quanto o celular
 * digitam oito dígitos crus. Estas funções são a única tradução entre esses dígitos e o ISO que o
 * payload aceita — o cadastro rápido e o assistente do cadastro completo compartilham a mesma cópia.
 */

// Limite superior de sanidade para campos de data genéricos (ex.: "data prevista da festa").
const MAX_YEAR = 2200;
const MIN_YEAR = 1900;

/** Preview progressivo do teclado numérico: "31121990" -> "31/12/1990". */
export function formatDateDigits(digits: string): string {
	const day = digits.slice(0, 2);
	const month = digits.slice(2, 4);
	const year = digits.slice(4, 8);
	return [day, month, year].filter((part) => part.length > 0).join("/");
}

/**
 * "DDMMAAAA" -> "AAAA-MM-DD" (o formato que o schema transforma em Date).
 * Null = data incompleta ou inexistente (ex.: 31/02); nunca enviar DD/MM cru no payload.
 */
export function parseDateDigitsToIso(digits: string): string | null {
	if (digits.length !== 8) return null;
	const day = Number(digits.slice(0, 2));
	const month = Number(digits.slice(2, 4));
	const year = Number(digits.slice(4, 8));
	const date = new Date(year, month - 1, day);
	const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	if (!isRealDate || year < MIN_YEAR || year > MAX_YEAR) return null;
	return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/**
 * Como `parseDateDigitsToIso`, mas recusa datas no futuro — uma data de nascimento não pode estar
 * à frente de hoje, enquanto um campo de data qualquer pode.
 */
export function parseBirthDateDigitsToIso(digits: string): string | null {
	const isoDate = parseDateDigitsToIso(digits);
	if (!isoDate) return null;
	if (new Date(isoDate).getTime() > Date.now()) return null;
	return isoDate;
}
