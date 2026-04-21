import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 60,
};

const monthlyReportHandler: NextApiHandler = async (req, res) => {
	return runRecurrentSalesReport({ frequency: "monthly", req, res });
};

export default monthlyReportHandler;
