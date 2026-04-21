import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import type { TReportFrequency, TReportPeriod } from "./types";

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
			storageKey: `${after.format("YYYY")}-W${after.format("WW")}`,
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
