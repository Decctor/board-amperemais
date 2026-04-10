import { generateHintsForSubject } from "@/lib/ai-hints/generate-hints";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { GenerateHintsInputSchema } from "@/schemas/ai-hints";
import { db } from "@/services/drizzle";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { aiHints } from "@/services/drizzle/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";
import { HINTS_AMMOUNT_VALIDATION_THRESHOLD } from "@/config";
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

async function generateHints({ session }: { session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { startOfWeek, endOfWeek } = getCurrentSundayBasedWeekRange();
	const generatedHintsInPeriodCountResult = await db
		.select({ count: count() })
		.from(aiHints)
		.where(and(eq(aiHints.organizacaoId, orgId), gte(aiHints.dataInsercao, startOfWeek), lt(aiHints.dataInsercao, endOfWeek)));

	const generatedHintsInPeriodCount = generatedHintsInPeriodCountResult[0]?.count ?? 0;
	if (generatedHintsInPeriodCount >= HINTS_AMMOUNT_VALIDATION_THRESHOLD) {
		throw new createHttpError.BadRequest("Você atingiu o limite de dicas geradas por semana.");
	}

	const generationResult = await runMarketingAgent({
		brief: "Eu quero criar uma nova campanha de marketing (ou otimizar uma das existentes) com potência de grande impacto.",
		organizacaoId: orgId,
		debug: false,
		persistSuggestion: true,
	});

	return {
		data: {
			generatedHints: generationResult.hint ? 1 : 0,
		},
		message: "Dica gerada com sucesso.",
	};
}
export type TGenerateHintsOutput = Awaited<ReturnType<typeof generateHints>>;

async function generateHintsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const result = await generateHints({ session });

	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: generateHintsRoute });
