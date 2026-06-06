import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { absoluteUrl } from "@/lib/utils";
import { sendMessage, type SendMessageContent } from "@/lib/whatsapp/internal-gateway";
import { formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import { waitUntil } from "@vercel/functions";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { aiHints } from "@/services/drizzle/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";
import { HINTS_AMMOUNT_VALIDATION_THRESHOLD } from "@/config";
import { runMarketingAgent } from "@/lib/ai/ai-agent/marketing";
import type { TAIHint } from "@/schemas/ai-hints";

const INTERNAL_SESSION_ID = process.env.INTERNAL_WHATSAPP_GATEWAY_SESSION_COMS as string;

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

function buildHintActionUrl(path: string, hintId: string) {
	const url = absoluteUrl(path);
	const nextUrl = new URL(url);
	nextUrl.searchParams.set("id", hintId);
	return nextUrl.href;
}

function buildHintWhatsappMessage({ hint }: { hint: TAIHint }): SendMessageContent {
	const approveUrl = buildHintActionUrl("/api/ai-hints/approve", hint.id);
	const dismissUrl = buildHintActionUrl("/api/ai-hints/dismiss", hint.id);

	return {
		type: "text",
		text: `Nova dica de IA pronta para revisão.

*${hint.conteudo.titulo}*
${hint.conteudo.descricao}

Abra uma das opções abaixo para aprovar ou descartar a dica. Você precisa estar autenticado no CRM para concluir a ação.`,
		footerText: "Escolha uma ação",
		buttons: [
			{
				type: "url",
				text: "Aprovar dica",
				url: approveUrl,
			},
			{
				type: "url",
				text: "Descartar dica",
				url: dismissUrl,
			},
		],
	};
}

async function notifyOrganizationOwnerAboutHint({ traceId, organizacaoId, hint }: { traceId: string; organizacaoId: string; hint: TAIHint }) {
	if (!INTERNAL_SESSION_ID) {
		logGenerateHints("WHATSAPP_NOTIFICATION_SKIPPED", {
			traceId,
			organizacaoId,
			hintId: hint.id,
			reason: "internal_session_not_configured",
		});
		return;
	}

	if (!process.env.NEXT_PUBLIC_APP_URL) {
		logGenerateHints("WHATSAPP_NOTIFICATION_SKIPPED", {
			traceId,
			organizacaoId,
			hintId: hint.id,
			reason: "app_url_not_configured",
		});
		return;
	}

	const organization = await db.query.organizations.findFirst({
		columns: {
			id: true,
			nome: true,
		},
		where: (fields, { eq }) => eq(fields.id, organizacaoId),
		with: {
			autor: {
				columns: {
					telefone: true,
				},
			},
		},
	});

	const ownerPhone = organization?.autor?.telefone;
	if (!organization || !ownerPhone) {
		logGenerateHints("WHATSAPP_NOTIFICATION_SKIPPED", {
			traceId,
			organizacaoId,
			hintId: hint.id,
			reason: "owner_phone_not_available",
		});
		return;
	}

	try {
		const result = await sendMessage(INTERNAL_SESSION_ID, formatPhoneForInternalGateway(ownerPhone), buildHintWhatsappMessage({ hint }));
		logGenerateHints("WHATSAPP_NOTIFICATION_SENT", {
			traceId,
			organizacaoId,
			hintId: hint.id,
			orgNome: organization.nome,
			messageId: result.clientMessageId ?? result.jobId ?? null,
		});
	} catch (error) {
		logGenerateHintsError("WHATSAPP_NOTIFICATION_FAILED", {
			traceId,
			organizacaoId,
			hintId: hint.id,
			error,
		});
	}
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
		const generatedHint = generationResult.hint;

		waitUntil(
			notifyOrganizationOwnerAboutHint({
				traceId,
				organizacaoId: orgId,
				hint: generatedHint,
			}),
		);

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
