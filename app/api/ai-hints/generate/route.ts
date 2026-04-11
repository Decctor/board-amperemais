import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
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

function getElapsedMs(startedAt: number) {
	return Date.now() - startedAt;
}

function logGenerateHints(event: string, payload: Record<string, unknown>) {
	console.log(`[INFO] [AI_HINTS_GENERATE] [${event}]`, payload);
}

function logGenerateHintsError(event: string, payload: Record<string, unknown>) {
	console.error(`[ERROR] [AI_HINTS_GENERATE] [${event}]`, payload);
}

async function generateHints({ session, traceId }: { session: TAuthUserSession; traceId: string }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const startedAt = Date.now();

	logGenerateHints("START", {
		traceId,
		organizacaoId: orgId,
		usuarioId: session.user.id,
	});

	try {
		const { startOfWeek, endOfWeek } = getCurrentSundayBasedWeekRange();
		const quotaValidationStartedAt = Date.now();
		const generatedHintsInPeriodCountResult = await db
			.select({ count: count() })
			.from(aiHints)
			.where(and(eq(aiHints.organizacaoId, orgId), gte(aiHints.dataInsercao, startOfWeek), lt(aiHints.dataInsercao, endOfWeek)));
		const quotaValidationDurationMs = getElapsedMs(quotaValidationStartedAt);

		const generatedHintsInPeriodCount = generatedHintsInPeriodCountResult[0]?.count ?? 0;

		logGenerateHints("QUOTA_CHECK_COMPLETED", {
			traceId,
			organizacaoId: orgId,
			durationMs: quotaValidationDurationMs,
			generatedHintsInPeriodCount,
			threshold: HINTS_AMMOUNT_VALIDATION_THRESHOLD,
		});

		if (generatedHintsInPeriodCount >= HINTS_AMMOUNT_VALIDATION_THRESHOLD) {
			throw new createHttpError.BadRequest("Você atingiu o limite de dicas geradas por semana.");
		}

		const agentStartedAt = Date.now();
		const generationResult = await runMarketingAgent({
			traceId,
			brief:
				"Analise o contexto atual da organização e gere a melhor sugestão acionável de alto impacto para campanhas de WhatsApp. Escolha entre otimizar uma campanha existente com oportunidade clara ou propor uma nova campanha quando isso for mais promissor.",
			organizacaoId: orgId,
			debug: false,
			persistSuggestion: true,
			requireActionableSuggestion: true,
		});
		console.log(generationResult.hint);
		const agentDurationMs = getElapsedMs(agentStartedAt);

		logGenerateHints("AGENT_COMPLETED", {
			traceId,
			organizacaoId: orgId,
			durationMs: agentDurationMs,
			status: generationResult.status,
			hintGenerated: Boolean(generationResult.hint),
			steps: generationResult.metadata.steps,
			tokensUsed: generationResult.metadata.tokensUsed,
		});

		if (!generationResult.hint) {
			throw new createHttpError.InternalServerError("A IA não conseguiu gerar uma dica acionável para revisão.");
		}

		const result = {
			data: {
				generatedHints: 1,
			},
			message: "Dica gerada com sucesso.",
		};

		logGenerateHints("COMPLETED", {
			traceId,
			organizacaoId: orgId,
			durationMs: getElapsedMs(startedAt),
			generatedHints: result.data.generatedHints,
		});

		return result;
	} catch (error) {
		logGenerateHintsError("FAILED", {
			traceId,
			organizacaoId: orgId,
			durationMs: getElapsedMs(startedAt),
			error,
		});

		throw error;
	}
}
export type TGenerateHintsOutput = Awaited<ReturnType<typeof generateHints>>;

async function generateHintsRoute(request: NextRequest) {
	const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
	const startedAt = Date.now();

	logGenerateHints("REQUEST_RECEIVED", {
		traceId,
		method: request.method,
	});

	try {
		const authStartedAt = Date.now();
		const session = await getCurrentSessionUncached();
		const authDurationMs = getElapsedMs(authStartedAt);

		logGenerateHints("AUTH_CHECK_COMPLETED", {
			traceId,
			durationMs: authDurationMs,
			authenticated: Boolean(session),
		});

		if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

		const result = await generateHints({ session, traceId });

		logGenerateHints("RESPONSE_READY", {
			traceId,
			statusCode: 200,
			durationMs: getElapsedMs(startedAt),
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		logGenerateHintsError("REQUEST_FAILED", {
			traceId,
			durationMs: getElapsedMs(startedAt),
			error,
		});

		throw error;
	}
}

export const POST = appApiHandler({ POST: generateHintsRoute });
