import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { aiHints } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { and, eq, gte, lt } from "drizzle-orm";
import { HINTS_AMMOUNT_VALIDATION_THRESHOLD } from "@/config";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { NextResponse, NextRequest } from "next/server";
import { appApiHandler } from "@/lib/app-api";

function getCurrentSundayBasedWeekRange() {
	const now = dayjs();
	const startOfWeek = now.startOf("day").subtract(now.day(), "day");
	const endOfWeek = startOfWeek.add(7, "day");

	return {
		startOfWeek: startOfWeek.toDate(),
		endOfWeek: endOfWeek.toDate(),
	};
}

async function checkAvailableAiHintsUsage({ session }: { session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const { startOfWeek, endOfWeek } = getCurrentSundayBasedWeekRange();

	const generatedHintsInPeriod = await db.query.aiHints.findMany({
		where: and(eq(aiHints.organizacaoId, orgId), gte(aiHints.dataInsercao, startOfWeek), lt(aiHints.dataInsercao, endOfWeek)),
	});

	return {
		data: {
			usedHints: generatedHintsInPeriod.length,
			availableHints: HINTS_AMMOUNT_VALIDATION_THRESHOLD - generatedHintsInPeriod.length,
		},
	};
}

export type TCheckAvailableAiHintsUsageOutput = Awaited<ReturnType<typeof checkAvailableAiHintsUsage>>;

async function checkAvailableAiHintsUsageRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const result = await checkAvailableAiHintsUsage({ session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: checkAvailableAiHintsUsageRoute });
