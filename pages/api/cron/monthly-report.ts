import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const monthlyReportHandler: NextApiHandler = async (req, res) => {
	// disable monthly report for now
	return res.status(200).json({
		message: "Monthly report skipped: monthly report is disabled for now.",
	});
	return runRecurrentSalesReport({ frequency: "monthly", req, res });
};

export default monthlyReportHandler;
