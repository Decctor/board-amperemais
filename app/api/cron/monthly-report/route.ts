import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { NextRequest, NextResponse } from "next/server";

async function getMonthlyReportRoute(_req: NextRequest) {
	return NextResponse.json(
		{
			message: "Monthly report skipped: monthly report is disabled for now.",
		},
		{ status: 200 },
	);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getMonthlyReportRoute(req);
	},
});
