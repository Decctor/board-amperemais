import dayjs from "dayjs";
import type { TFinancialRecurringRuleConfig } from "@/schemas/financial-recurring";

function clampDay(base: dayjs.Dayjs, day: number) {
	return Math.min(Math.max(Math.trunc(day), 1), base.daysInMonth());
}

function withDayOfMonth(base: dayjs.Dayjs, day: number) {
	return base.startOf("month").date(clampDay(base, day));
}

function normalizeOccurrenceDate(date: dayjs.Dayjs, config: TFinancialRecurringRuleConfig) {
	if (config.frequencia === "SEMANAL" && config.diaDaSemana !== null && config.diaDaSemana !== undefined)
		return date.day(config.diaDaSemana).startOf("day");
	if ((config.frequencia === "MENSAL" || config.frequencia === "ANUAL") && config.diaDoMes)
		return withDayOfMonth(date, config.diaDoMes).startOf("day");
	return date.startOf("day");
}

function addRecurringInterval(date: dayjs.Dayjs, config: TFinancialRecurringRuleConfig) {
	const interval = config.intervalo || 1;
	if (config.frequencia === "DIARIA") return date.add(interval, "day");
	if (config.frequencia === "SEMANAL") return date.add(interval, "week");
	if (config.frequencia === "ANUAL") return withDayOfMonth(date.add(interval, "year"), config.diaDoMes ?? date.date());
	return withDayOfMonth(date.add(interval, "month"), config.diaDoMes ?? date.date());
}

export function getNextRecurringOccurrence(afterDate: Date, config: TFinancialRecurringRuleConfig) {
	let occurrence = normalizeOccurrenceDate(dayjs(config.inicio), config);
	const after = dayjs(afterDate).startOf("day");
	for (let index = 0; index < 500 && !occurrence.isAfter(after, "day"); index++)
		occurrence = normalizeOccurrenceDate(addRecurringInterval(occurrence, config), config);
	if (config.fim && occurrence.isAfter(dayjs(config.fim), "day")) return null;
	return occurrence.toDate();
}

export function getRecurringOccurrencesUntil(config: TFinancialRecurringRuleConfig, startAt: Date, horizon: Date) {
	const dates: Date[] = [];
	let occurrence = normalizeOccurrenceDate(dayjs(startAt), config);
	const end = dayjs(config.fim && dayjs(config.fim).isBefore(horizon) ? config.fim : horizon).endOf("day");
	for (let index = 0; index < 500 && occurrence.isBefore(end); index++) {
		if (occurrence.isAfter(dayjs(startAt).subtract(1, "day"), "day")) dates.push(occurrence.toDate());
		occurrence = normalizeOccurrenceDate(addRecurringInterval(occurrence, config), config);
	}
	return dates;
}
