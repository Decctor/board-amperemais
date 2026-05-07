import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const dailyReportHandler: NextApiHandler = async (req, res) => {
	// disable daily report for now
	return res.status(200).json({
		message: "Daily report skipped: daily report is disabled for now.",
	});
	return runRecurrentSalesReport({ frequency: "daily", req, res });
};

export default dailyReportHandler;
