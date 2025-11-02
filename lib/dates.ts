import dayjs from "dayjs";
import { formatDecimalPlaces } from "./formatting";

export function getMonthPeriodsStrings({ initialYear, endYear }: { initialYear: number; endYear: number }) {
	let iteratingYear = initialYear;

	const periods: string[] = [];
	for (let i = 1; i <= 12; i++) {
		const str = i < 10 ? `0${i}/${iteratingYear}` : `${i}/${iteratingYear}`;

		periods.push(str);

		// Resetting month and adding up a year
		if (i === 12) {
			// If iterating year is end year and the month is 12, stop iteration
			if (iteratingYear === endYear) break;
			iteratingYear += 1;
			i = 0;
		}
	}
	return periods;
}
export function getDayStringsBetweenDates({ initialDate, endDate, format }: { initialDate: string; endDate: string; format?: string }) {
	const strings = [];
	let iteratingDate = dayjs(initialDate);
	const goalDate = dayjs(endDate);

	while (iteratingDate.isBefore(goalDate) || iteratingDate.isSame(goalDate, "day")) {
		const dayStr = iteratingDate.format(format || "DD/MM");
		strings.push(dayStr);
		iteratingDate = iteratingDate.add(1, "day");
	}

	return strings;
}
export function getYearStringsBetweenDates({ initialDate, endDate }: { initialDate: string; endDate: string }) {
	const strings = [];
	let iteratingYear = dayjs(initialDate).year();
	const goalYear = dayjs(endDate).year();

	while (iteratingYear <= goalYear) {
		strings.push(iteratingYear);
		iteratingYear += 1;
	}

	return strings;
}
export function getHoursDiff({ start, finish, businessOnly }: { start: string | Date; finish: string | Date; businessOnly?: boolean }) {
	// if (businessOnly) {
	//   // @ts-ignore
	//   const hourDiff = dayjs(finish).businessDiff(dayjs(start), 'hour')
	//   return hourDiff
	// }
	const hourDiff = dayjs(finish).diff(dayjs(start), "hour");
	return hourDiff;
}
export function getFixedDate(date: string, type: "start" | "end") {
	if (type === "start") return dayjs(date).add(3, "hour").startOf("day").toDate() as Date;

	if (type === "end") return dayjs(date).add(3, "hour").endOf("day").toDate() as Date;

	return dayjs(date).startOf("day").subtract(3, "hour").toDate();
}

type GetPeriodDateParamsByReferenceDateParams = {
	reference: string | Date;
	type?: "month" | "year";
	resetStart?: boolean;
	resetEnd?: boolean;
};
export function getPeriodDateParamsByReferenceDate({ reference, type = "month", resetStart, resetEnd }: GetPeriodDateParamsByReferenceDateParams) {
	if (type === "month") {
		let start = dayjs(reference).startOf("month");
		let end = dayjs(reference).endOf("month");
		if (resetStart) start = start.subtract(3, "hour");
		if (resetEnd) end = end.startOf("day").subtract(3, "hour");
		return { start: start.toDate(), end: end.toDate() };
	}
	if (type === "year") {
		let start = dayjs(reference).startOf("year");
		let end = dayjs(reference).endOf("year");
		if (resetStart) start = start.subtract(3, "hour");
		if (resetEnd) end = end.startOf("day").subtract(3, "hour");
		return { start: start.toDate(), end: end.toDate() };
	}

	// Default for month
	let start = dayjs(reference).startOf("month");
	let end = dayjs(reference).endOf("month");
	if (resetStart) start = start.subtract(3, "hour");
	if (resetEnd) end = end.startOf("day").subtract(3, "hour");
	return { start: start.toDate(), end: end.toDate() };
}

export function getDateFromString(value: any) {
	if (!value) return undefined;
	if (Number.isNaN(new Date(value).getMilliseconds())) return undefined;
	return new Date(value);
}
export function getDateIsWithinPeriod({ date, after, before }: { date: Date | undefined; after: Date; before: Date }) {
	return !!(date && date >= after && date <= before);
}

export function getTimeFormattedTextFromHours(hours: number) {
	if (hours > 24) {
		const days = hours / 24;
		return `${formatDecimalPlaces(days)} ${days > 2 ? "DIAS" : "DIA"}`;
	}
	return `${formatDecimalPlaces(hours)} ${hours > 2 ? "HORAS" : "HORA"}`;
}

export function getMetadataFromHoursAmount(hours: number, reference: "months" | "days" | "hours") {
	if (reference === "months") {
		const totalDays = Math.floor(hours / 24);
		const months = Math.floor(totalDays / 30); // Using 30 as average month length
		const remainingDays = totalDays % 30;
		return {
			complete: months,
			remaining: remainingDays,
			unit: "months" as const,
			remainingUnit: "days" as const,
		};
	}

	if (reference === "days") {
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return {
			complete: days,
			remaining: remainingHours,
			unit: "days" as const,
			remainingUnit: "hours" as const,
		};
	}

	// reference ==== 'hours'
	const completeHours = Math.floor(hours);
	const remainingMinutes = Math.round((hours - completeHours) * 60);
	return {
		complete: completeHours,
		remaining: remainingMinutes,
		unit: "hours" as const,
		remainingUnit: "minutes" as const,
	};
}

export function getFormattedTextFromHoursAmount({
	hours,
	reference,
	onlyComplete,
}: {
	hours: number;
	reference: "months" | "days" | "hours";
	onlyComplete: boolean;
}) {
	const metadata = getMetadataFromHoursAmount(hours, reference);
	const referenceMap = {
		months: {
			singular: "mês",
			plural: "meses,",
		},
		days: {
			singular: "dia",
			plural: "dias.",
		},
		hours: {
			singular: "hora",
			plural: "horas.",
		},
		minutes: {
			singular: "minuto",
			plural: "minutos.",
		},
	};

	const completeUnitFormatted = referenceMap[metadata.unit];
	const remainingUnitFormatted = referenceMap[metadata.remainingUnit];

	if (onlyComplete) return `${metadata.complete} ${metadata.complete > 1 ? completeUnitFormatted.plural : completeUnitFormatted.singular}`;
	return `${metadata.complete} ${metadata.complete > 1 ? completeUnitFormatted.plural : completeUnitFormatted.singular} e ${formatDecimalPlaces(metadata.remaining)} ${metadata.remaining > 1 ? remainingUnitFormatted.plural : remainingUnitFormatted.singular}`;
}

export function getEvenlySpacedDates({ startDate, endDate, points = 7 }: { startDate: Date; endDate: Date; points?: number }): Date[] {
	const start = dayjs(startDate);
	const end = dayjs(endDate);

	// Calculate the total duration in milliseconds
	const totalDuration = end.diff(start);
	// Calculate the interval between each date (divide by 6 to get 7 points total)
	const interval = totalDuration / (points - 1);

	// Generate the 7 dates
	return Array.from({ length: points }, (_, index) => {
		return start.add(interval * index).toDate();
	});
}

export function getDatePeriodMetadata({ startDate, endDate }: { startDate: Date; endDate: Date }) {
	const seconds = dayjs(endDate).diff(dayjs(startDate), "second");
	const minutes = dayjs(endDate).diff(dayjs(startDate), "minute");
	const hours = dayjs(endDate).diff(dayjs(startDate), "hour");
	const days = dayjs(endDate).diff(dayjs(startDate), "day");
	const months = dayjs(endDate).diff(dayjs(startDate), "month");
	const years = dayjs(endDate).diff(dayjs(startDate), "year");
	return { seconds, minutes, hours, days, months, years };
}

export function getBestNumberOfPointsBetweenDates({
	startDate,
	endDate,
}: {
	startDate: Date;
	endDate: Date;
}): {
	groupingFormat: string;
	points: number;
} {
	const metadata = getDatePeriodMetadata({ startDate, endDate });

	// Casos específicos para períodos comuns

	// Caso: Aproximadamente 1 dia (20-28 horas)
	if (metadata.hours >= 20 && metadata.hours <= 28) {
		return {
			groupingFormat: "HH:mm",
			points: 24,
		}; // Um ponto por hora
	}

	// Caso: Aproximadamente 1 mês (28-31 dias)
	if (metadata.days >= 28 && metadata.days <= 31) {
		return {
			groupingFormat: "DD/MM",
			points: metadata.days,
		}; // Um ponto por dia
	}

	// Caso: Aproximadamente 1 ano
	if (metadata.days >= 360 && metadata.days <= 366) {
		return {
			groupingFormat: "DD/MM",
			points: metadata.days,
		}; // Um ponto por dia do ano
	}

	// Para outros casos, usar uma lógica adaptativa
	if (metadata.days < 1) {
		// Menos de um dia: dividir por horas
		return {
			groupingFormat: "HH:mm",
			points: Math.max(12, metadata.hours),
		};
	}
	if (metadata.days < 7) {
		// Menos de uma semana: 4 pontos por dia
		return {
			groupingFormat: "DD/MM HH:mm",
			points: metadata.days * 4,
		};
	}
	if (metadata.days < 30) {
		// Menos de um mês: 1 ponto por dia
		return {
			groupingFormat: "DD/MM",
			points: metadata.days,
		};
	}
	if (metadata.days < 90) {
		// Menos de 3 meses: 1 ponto a cada 2 dias
		return {
			groupingFormat: "DD/MM",
			points: Math.ceil(metadata.days / 2),
		};
	}
	if (metadata.days < 365) {
		// Menos de um ano: 1 ponto a cada semana
		return {
			groupingFormat: "DD/MM",
			points: Math.ceil(metadata.days / 7),
		};
	}
	// Mais de um ano: 1 ponto a cada mês
	return {
		groupingFormat: "MM/YYYY",
		points: Math.max(metadata.months, 12),
	};
}

export function getDateBuckets(dates: Date[]) {
	const buckets = dates.map((date, index, arr) => {
		const nextDate = arr[index + 1];
		const start = date;
		const end = nextDate || date; // último bucket usa a mesma data
		const key = date.toISOString();

		return {
			key,
			start: start.getTime(),
			end: end.getTime(),
		};
	});

	return buckets;
}
