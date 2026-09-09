import dayjs from "dayjs";

/**
 * Chave do dia corrente ("YYYY-MM-DD") para memoizar períodos "de hoje" nos widgets. Um dashboard
 * fica aberto o dia inteiro num tablet de balcão: constantes de módulo congelariam o período na
 * primeira renderização; com a chave, o próximo render após a virada do dia refaz as consultas.
 */
export function useDayKey() {
	return dayjs().format("YYYY-MM-DD");
}

export function resolveTodayRange(dayKey: string) {
	const day = dayjs(dayKey);
	return { after: day.startOf("day"), before: day.endOf("day") };
}
