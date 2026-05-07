import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const weeklyReportHandler: NextApiHandler = async (req, res) => {
	// disable weekly report for now
	return res.status(200).json({
		message: "Weekly report skipped: weekly report is disabled for now.",
	});
	return runRecurrentSalesReport({ frequency: "weekly", req, res });
};

export default weeklyReportHandler;
