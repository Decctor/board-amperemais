import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { NextRequest, NextResponse } from "next/server";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATA_COLLECTING_TIMEZONE = process.env.DATA_COLLECTING_TIMEZONE ?? "America/Sao_Paulo";

/**
 * Syncs the previous 5 full days, excluding today, to catch sales or cancellations
 * missed by the main data-collecting cron.
 *
 * Campaigns stay disabled so past sales do not trigger NOVA-COMPRA/PRIMEIRA-COMPRA
 * interactions. Cashback and conversion attribution still run for newly imported
 * valid sales, and cashback reversal still runs for retroactive cancellations.
 */
async function getFixPreviousSalesRoute(_req: NextRequest) {
	const referenceDate = dayjs().tz(DATA_COLLECTING_TIMEZONE);
	const startDate = referenceDate.subtract(5, "day").startOf("day").toDate();
	const endDate = referenceDate.subtract(1, "day").endOf("day").toDate();

	console.log("[INFO] [FIX_PREVIOUS_SALES] Starting previous sales sync", {
		timezone: DATA_COLLECTING_TIMEZONE,
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		effects: {
			processCashback: true,
			processCampaigns: false,
			processConversionAttribution: true,
		},
	});

	const result = await runDataCollectingV2({
		window: {
			startDate,
			endDate,
		},
		processImmediateInteractions: false,
		effects: {
			processCashback: true,
			processCampaigns: false,
			processConversionAttribution: true,
		},
	});

	console.log("[INFO] [FIX_PREVIOUS_SALES] Processing concluded", {
		summaries: result.summaries.length,
		errors: result.errors.length,
		importedSalesCount: result.summaries.reduce((total, summary) => total + summary.importedSalesCount, 0),
		createdSalesCount: result.summaries.reduce((total, summary) => total + summary.createdSalesCount, 0),
		updatedSalesCount: result.summaries.reduce((total, summary) => total + summary.updatedSalesCount, 0),
		cashbackTransactionsCount: result.summaries.reduce((total, summary) => total + summary.cashbackTransactionsCount, 0),
	});

	return NextResponse.json(
		{
			data: result,
			message:
				result.errors.length > 0
					? "Correção de vendas anteriores concluída com erros em algumas organizações."
					: "Correção de vendas anteriores executada com sucesso.",
		},
		{ status: 200 },
	);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getFixPreviousSalesRoute(req);
	},
});
