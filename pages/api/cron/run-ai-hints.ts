import { db } from "@/services/drizzle";
import { aiHints, organizations } from "@/services/drizzle/schema";
import { and, count, gte, inArray, lt } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";
import { runMarketingAgent } from "@/lib/ai-agent/marketing";

function getCurrentSundayBasedWeekRange() {
	const now = dayjs();
	const startOfWeek = now.startOf("day").subtract(now.day(), "day");
	const endOfWeek = startOfWeek.add(7, "day");

	return {
		startOfWeek: startOfWeek.toDate(),
		endOfWeek: endOfWeek.toDate(),
	};
}

export default async function handleRunAIHints(req: NextApiRequest, res: NextApiResponse) {
	const ORGANIZATIONS_WHITE_LIST_IDS = ["4a4e8578-63f0-4119-9695-a2cc068de8d6", "27817d9a-cb04-4704-a1f4-15b81a3610d3"];
	const HINTS_AMMOUNT_VALIDATION_THRESHOLD = 5; // 5 hints per week
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
			brief: "Eu quero criar uma nova campanha de marketing (ou otimizar uma das existentes) com potência de grande impacto.",
			organizacaoId: organizationId,
			debug: false,
			persistSuggestion: true,
		});
	});

	const agentResults = await Promise.all(agentResultsPromises);

	return res.status(200).json({
		data: {
			weekStart: startOfWeek.toISOString(),
			weekEnd: endOfWeek.toISOString(),
			organizationsChecked: organizationsList.length,
			organizationsQueued: organizationsToRunAgent.length,
			hintsCreated: agentResults.filter((result) => result.hint).length,
		},
		message: "Execução semanal de hints concluída com sucesso.",
	});
}
