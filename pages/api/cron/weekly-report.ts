import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const weeklyReportHandler: NextApiHandler = async (req, res) => {
	return runRecurrentSalesReport({ frequency: "weekly", req, res });
};

export default weeklyReportHandler;
