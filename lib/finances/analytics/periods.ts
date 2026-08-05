import dayjs from "dayjs";

/**
 * Janela imediatamente anterior de duração idêntica: termina 1ms antes do início do período atual.
 * É a base de toda comparação período-a-período dos relatórios financeiros.
 */
export function getPreviousPeriod(period: { after: Date; before: Date }) {
	const durationMs = period.before.getTime() - period.after.getTime();
	return {
		after: new Date(period.after.getTime() - 1 - durationMs),
		before: new Date(period.after.getTime() - 1),
	};
}

/** Chaves "YYYY-MM" dos 12 meses que encerram no mês de `before`, em ordem cronológica. */
export function getTrailingMonthKeys(before: Date, months = 12) {
	const seriesEnd = dayjs(before).endOf("month");
	const seriesStart = seriesEnd.subtract(months - 1, "month").startOf("month");
	const keys: string[] = [];
	for (let monthOffset = 0; monthOffset < months; monthOffset++) {
		keys.push(seriesStart.add(monthOffset, "month").format("YYYY-MM"));
	}
	return keys;
}

/** Limites (Date) da série de `getTrailingMonthKeys`, para filtrar a query agregada. */
export function getTrailingMonthsRange(before: Date, months = 12) {
	const seriesEnd = dayjs(before).endOf("month");
	const seriesStart = seriesEnd.subtract(months - 1, "month").startOf("month");
	return { after: seriesStart.toDate(), before: seriesEnd.toDate() };
}
