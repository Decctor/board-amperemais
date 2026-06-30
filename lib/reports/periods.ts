import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import weekOfYear from "dayjs/plugin/weekOfYear";
import type { TReportFrequency, TReportPeriod } from "./types";

dayjs.extend(weekOfYear);
dayjs.locale("pt-br");

export function getReportPeriod(frequency: TReportFrequency, referenceDate = new Date()): TReportPeriod {
	const baseDate = dayjs(referenceDate);

	if (frequency === "daily") {
		const target = baseDate.subtract(1, "day");
		const comparison = target.subtract(1, "day");

		return {
			frequency,
			label: target.format("DD/MM/YYYY"),
			after: target.startOf("day").toDate(),
			before: target.endOf("day").toDate(),
			comparisonAfter: comparison.startOf("day").toDate(),
			comparisonBefore: comparison.endOf("day").toDate(),
			storageKey: target.format("YYYY-MM-DD"),
		};
	}

	if (frequency === "weekly") {
		const target = baseDate.subtract(1, "week");
		const comparison = baseDate.subtract(2, "week");

		const after = target.day(0).startOf("day");
		const before = target.day(6).endOf("day");
		const comparisonAfter = comparison.day(0).startOf("day");
		const comparisonBefore = comparison.day(6).endOf("day");

		return {
			frequency,
			label: `${after.format("DD/MM/YYYY")} a ${before.format("DD/MM/YYYY")}`,
			after: after.toDate(),
			before: before.toDate(),
			comparisonAfter: comparisonAfter.toDate(),
			comparisonBefore: comparisonBefore.toDate(),
			storageKey: `${after.format("YYYY")}-W${String(after.week()).padStart(2, "0")}`,
		};
	}

	if (frequency === "biweekly") {
		const isFirstHalfClosed = baseDate.date() > 15;

		if (isFirstHalfClosed) {
			const target = baseDate.startOf("month");
			const targetEnd = baseDate.date(15).endOf("day");
			const comparisonMonth = baseDate.subtract(1, "month");
			const comparisonAfter = comparisonMonth.date(16).startOf("day");
			const comparisonBefore = comparisonMonth.endOf("month");

			return {
				frequency,
				label: `${target.format("DD/MM/YYYY")} a ${targetEnd.format("DD/MM/YYYY")}`,
				after: target.startOf("day").toDate(),
				before: targetEnd.toDate(),
				comparisonAfter: comparisonAfter.toDate(),
				comparisonBefore: comparisonBefore.toDate(),
				storageKey: `${target.format("YYYY-MM")}-H1`,
			};
		}

		const targetMonth = baseDate.subtract(1, "month");
		const target = targetMonth.date(16).startOf("day");
		const targetEnd = targetMonth.endOf("month");
		const comparisonAfter = targetMonth.startOf("month");
		const comparisonBefore = targetMonth.date(15).endOf("day");

		return {
			frequency,
			label: `${target.format("DD/MM/YYYY")} a ${targetEnd.format("DD/MM/YYYY")}`,
			after: target.toDate(),
			before: targetEnd.toDate(),
			comparisonAfter: comparisonAfter.toDate(),
			comparisonBefore: comparisonBefore.toDate(),
			storageKey: `${target.format("YYYY-MM")}-H2`,
		};
	}

	const target = baseDate.subtract(1, "month");
	const comparison = baseDate.subtract(2, "month");
	return {
		frequency,
		label: target.format("MMMM/YYYY").toUpperCase(),
		after: target.startOf("month").toDate(),
		before: target.endOf("month").toDate(),
		comparisonAfter: comparison.startOf("month").toDate(),
		comparisonBefore: comparison.endOf("month").toDate(),
		storageKey: target.format("YYYY-MM"),
	};
}

export function shouldRunReportOnDate(frequency: TReportFrequency, referenceDate = new Date()) {
	const baseDate = dayjs(referenceDate);

	if (frequency === "daily") return true;
	if (frequency === "weekly") return baseDate.day() === 0;
	if (frequency === "monthly") return baseDate.date() === 1;

	return baseDate.date() === 16;
}
