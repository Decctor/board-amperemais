import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { runRecurrentSalesReport } from "@/lib/reports/run-recurrent-sales-report";
import { NextRequest, NextResponse } from "next/server";

async function getWeeklyReportRoute(_req: NextRequest) {
	const result = await runRecurrentSalesReport({ frequency: "weekly" });
	return NextResponse.json(result, { status: 200 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = appApiHandler({
	GET: async (req) => {
		// assertCronAuthorized(req);
		return getWeeklyReportRoute(req);
	},
});
