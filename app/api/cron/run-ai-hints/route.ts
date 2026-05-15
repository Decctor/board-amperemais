import { appApiHandler } from "@/lib/app-api";
import { runMarketingAgent } from "@/lib/ai-agent/marketing";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { db } from "@/services/drizzle";
import { aiHints, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, gte, inArray, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function getCurrentSundayBasedWeekRange() {
	const now = dayjs();
	const startOfWeek = now.startOf("day").subtract(now.day(), "day");
	const endOfWeek = startOfWeek.add(7, "day");

	return {
		startOfWeek: startOfWeek.toDate(),
		endOfWeek: endOfWeek.toDate(),
	};
}

async function getRunAIHintsRoute(_req: NextRequest) {
	const ORGANIZATIONS_WHITE_LIST_IDS = ["4a4e8578-63f0-4119-9695-a2cc068de8d6", "27817d9a-cb04-4704-a1f4-15b81a3610d3"];
	const HINTS_AMMOUNT_VALIDATION_THRESHOLD = 5;
	const { startOfWeek, endOfWeek } = getCurrentSundayBasedWeekRange();

	const organizationsList = await db.query.organizations.findMany({
		where: inArray(organizations.id, ORGANIZATIONS_WHITE_LIST_IDS),
		columns: {
			id: true,
		},
	});

	const groupedHintsPerOrg = await db
		.select({
			organizationId: aiHints.organizacaoId,
			hintsCount: count(),
		})
		.from(aiHints)
		.groupBy(aiHints.organizacaoId)
		.where(and(gte(aiHints.dataInsercao, startOfWeek), lt(aiHints.dataInsercao, endOfWeek)));

	const organizationsWithHintsMap = new Map<string, number>(
		organizationsList.map((organization) => [
			organization.id,
			groupedHintsPerOrg.find((hint) => hint.organizationId === organization.id)?.hintsCount ?? 0,
		]),
	);

	const organizationsToRunAgent = Array.from(organizationsWithHintsMap.entries())
		.filter(([_, hintsCount]) => hintsCount < HINTS_AMMOUNT_VALIDATION_THRESHOLD)
		.map(([organizationId]) => organizationId);

	const agentResultsPromises = organizationsToRunAgent.map(async (organizationId) => {
		return await runMarketingAgent({
			brief:
				"Analyze the current context of the organization and generate the best actionable suggestion for WhatsApp campaigns. Choose between optimizing an existing campaign with a clear opportunity or proposing a new campaign when this is more promising.",
			organizacaoId: organizationId,
			debug: false,
			persistSuggestion: true,
			requireActionableSuggestion: true,
		});
	});

	const agentResults = await Promise.all(agentResultsPromises);

	return NextResponse.json(
		{
			data: {
				weekStart: startOfWeek.toISOString(),
				weekEnd: endOfWeek.toISOString(),
				organizationsChecked: organizationsList.length,
				organizationsQueued: organizationsToRunAgent.length,
				hintsCreated: agentResults.filter((result) => result.hint).length,
			},
			message: "Weekly AI hints execution completed successfully.",
		},
		{ status: 200 },
	);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getRunAIHintsRoute(req);
	},
});
