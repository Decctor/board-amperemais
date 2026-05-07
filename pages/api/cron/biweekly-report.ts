import dayjs from "dayjs";
import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const biweeklyReportHandler: NextApiHandler = async (req, res) => {
	const today = dayjs();
	const isBiweeklyRunDay = today.date() === 15 || today.date() === today.endOf("month").date();

	// disable biweekly report for now
	return res.status(200).json({
		message: "Biweekly report skipped: biweekly report is disabled for now.",
	});
	if (!isBiweeklyRunDay) {
		return res.status(200).json({
			message: "Biweekly report skipped: today is not the 15th or the last day of the month.",
		});
	}

	return runRecurrentSalesReport({ frequency: "biweekly", req, res });
};

export default biweeklyReportHandler;
