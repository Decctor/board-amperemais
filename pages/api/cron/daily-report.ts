import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const dailyReportHandler: NextApiHandler = async (req, res) => {
	return runRecurrentSalesReport({ frequency: "daily", req, res });
};

export default dailyReportHandler;
