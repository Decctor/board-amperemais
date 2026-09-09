import { formatStringAsOnlyDigits } from "@/lib/formatting";
import dayjs from "dayjs";

/** "há 5 min", "há 3 h", "há 2 d" — curto o bastante para a coluna direita de uma linha de lista. */
export function formatTimeAgo(value: Date | string | null | undefined) {
	if (!value) return "";
	const minutes = Math.max(0, dayjs().diff(dayjs(value), "minute"));
	if (minutes < 1) return "agora";
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours} h`;
	return `há ${Math.floor(hours / 24)} d`;
}

/** Minutos restantes até um prazo (negativo = estourado). */
export function minutesUntil(deadline: Date | string) {
	return dayjs(deadline).diff(dayjs(), "minute");
}

/** Link `wa.me` a partir de um telefone brasileiro gravado em qualquer formatação. */
export function whatsappLink(telefone: string | null | undefined) {
	if (!telefone) return null;
	const digits = formatStringAsOnlyDigits(telefone);
	if (digits.length < 10) return null;
	const international = digits.length <= 11 ? `55${digits}` : digits;
	return `https://wa.me/${international}`;
}
