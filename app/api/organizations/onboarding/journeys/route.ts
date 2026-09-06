import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getJourneyDefinition, getOnboardingReadiness, getOrCreateJourney, resolveResumeStage } from "@/lib/onboarding";
import { OnboardingIntentOriginEnum, OnboardingProductEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { organizationOnboardings } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { enableErpTrial } from "@/lib/onboarding/erp-trial";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Cria (ou devolve) a jornada de um produto. Para o segundo produto, as etapas já satisfeitas
// pela prontidão não precisam ser refeitas: a etapa inicial é a primeira ainda pendente.
const CreateJourneyInputSchema = z.object({
	produto: OnboardingProductEnum,
	origemIntencao: OnboardingIntentOriginEnum,
});
export type TCreateJourneyInput = z.infer<typeof CreateJourneyInputSchema>;

async function createJourney({ input, session }: { input: TCreateJourneyInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para iniciar uma jornada.");

	let readiness = await getOnboardingReadiness({ executor: db, organizationId: organizacaoId });
	if (input.produto === "ERP" && !readiness.erp.acesso && readiness.erp.testeDisponivel) {
		await enableErpTrial({ organizationId: organizacaoId });
		readiness = await getOnboardingReadiness({ executor: db, organizationId: organizacaoId });
	}
	if (input.produto === "ERP" && !readiness.erp.acesso) {
		throw new createHttpError.Forbidden("A jornada ERP não está disponível no plano atual desta organização.");
	}

	const existing = readiness.jornadas.find((journey) => journey.produto === input.produto);
	if (existing) return { data: { journey: existing }, message: "Jornada já iniciada." };

	// Segundo produto: pula o que a prontidão já cobre (cashback ativo, WhatsApp conectado...).
	const origin = readiness.organizacao.dataOnboardingConclusao ? "SEGUNDO_PRODUTO" : input.origemIntencao;
	const resumeStage =
		origin === "SEGUNDO_PRODUTO"
			? resolveResumeStage({ produto: input.produto, journey: null, readiness })
			: getJourneyDefinition(input.produto).etapas[0].id;

	const journey = await getOrCreateJourney({
		executor: db,
		organizationId: organizacaoId,
		produto: input.produto,
		origemIntencao: origin,
		autorId: session.user.id,
		etapaAtual: resumeStage,
	});
	if (origin === "SEGUNDO_PRODUTO") {
		const visited = getJourneyDefinition(input.produto).etapas.filter((stage) => stage.isComplete(readiness, journey)).map((stage) => stage.id);
		const [updated] = await db.update(organizationOnboardings).set({ etapasVisitadas: [...new Set([...journey.etapasVisitadas, ...visited])] }).where(eq(organizationOnboardings.id, journey.id)).returning();
		Object.assign(journey, updated);
	}

	try {
		await captureServerEvent({
			distinctId: session.user.id,
			event: "onboarding_journey_selected",
			properties: { organization_id: organizacaoId, produto: input.produto, origem: input.origemIntencao },
		});
	} catch (error) {
		console.error("[WARN] [ONBOARDING_JOURNEYS] Falha ao capturar evento:", error);
	}

	return { data: { journey }, message: "Jornada iniciada." };
}
export type TCreateJourneyOutput = Awaited<ReturnType<typeof createJourney>>;

async function createJourneyRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = CreateJourneyInputSchema.parse(await request.json());
	const result = await createJourney({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createJourneyRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
