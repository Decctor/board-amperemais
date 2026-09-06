import type { TOnboardingIntentOriginEnum, TOnboardingProductEnum } from "@/schemas/enums";
import { DEFAULT_ONBOARDING_ANSWERS, type TOnboardingAnswers } from "@/schemas/onboarding";
import type { DB, DBTransaction } from "@/services/drizzle";
import { organizationOnboardings, organizations, type TOrganizationOnboardingEntity } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { getJourneyDefinition, isOnboardingStageId, type TOnboardingStageId } from "./journeys";

type TExecutor = DB | DBTransaction;

export async function getJourneys({ executor, organizationId }: { executor: TExecutor; organizationId: string }) {
	return executor.query.organizationOnboardings.findMany({ where: eq(organizationOnboardings.organizacaoId, organizationId) });
}

export async function getJourney({
	executor,
	organizationId,
	produto,
}: {
	executor: TExecutor;
	organizationId: string;
	produto: TOnboardingProductEnum;
}): Promise<TOrganizationOnboardingEntity | null> {
	const row = await executor.query.organizationOnboardings.findFirst({
		where: and(eq(organizationOnboardings.organizacaoId, organizationId), eq(organizationOnboardings.produto, produto)),
	});
	return row ?? null;
}

/**
 * Cria a jornada se não existir (idempotente pelo índice único org+produto). `etapaAtual`
 * inicial pode vir da migração do cookie antigo; senão é a primeira etapa da jornada.
 */
export async function getOrCreateJourney({
	executor,
	organizationId,
	produto,
	origemIntencao,
	autorId,
	etapaAtual,
	respostas,
}: {
	executor: TExecutor;
	organizationId: string;
	produto: TOnboardingProductEnum;
	origemIntencao: TOnboardingIntentOriginEnum;
	autorId: string | null;
	etapaAtual?: TOnboardingStageId | null;
	respostas?: Partial<TOnboardingAnswers>;
}): Promise<TOrganizationOnboardingEntity> {
	const existing = await getJourney({ executor, organizationId, produto });
	if (existing) return existing;

	const definition = getJourneyDefinition(produto);
	const initialStage = etapaAtual && isOnboardingStageId(produto, etapaAtual) ? etapaAtual : definition.etapas[0].id;

	await executor
		.insert(organizationOnboardings)
		.values({
			organizacaoId: organizationId,
			produto,
			origemIntencao,
			etapaAtual: initialStage,
			etapasAdiadas: [],
			etapasVisitadas: [initialStage],
			respostas: { ...DEFAULT_ONBOARDING_ANSWERS, ...respostas },
			autorId,
		})
		.onConflictDoNothing({ target: [organizationOnboardings.organizacaoId, organizationOnboardings.produto] });

	const created = await getJourney({ executor, organizationId, produto });
	if (!created) throw new createHttpError.InternalServerError("Não foi possível iniciar a jornada de onboarding.");
	return created;
}

export type TUpdateJourneyProgressInput = {
	executor: TExecutor;
	organizationId: string;
	produto: TOnboardingProductEnum;
	etapaAtual?: string | null;
	/** Etapa que o usuário escolheu fazer depois. Entra em `etapasAdiadas`. */
	adiarEtapa?: string | null;
	/** Etapa que voltou a ser feita: sai de `etapasAdiadas`. */
	retomarEtapa?: string | null;
	respostas?: Partial<TOnboardingAnswers>;
};

export async function updateJourneyProgress({
	executor,
	organizationId,
	produto,
	etapaAtual,
	adiarEtapa,
	retomarEtapa,
	respostas,
}: TUpdateJourneyProgressInput): Promise<TOrganizationOnboardingEntity> {
	const journey = await getJourney({ executor, organizationId, produto });
	if (!journey) throw new createHttpError.NotFound("Jornada de onboarding não encontrada.");

	if (etapaAtual && !isOnboardingStageId(produto, etapaAtual)) throw new createHttpError.BadRequest("Etapa inválida para esta jornada.");
	if (adiarEtapa && !isOnboardingStageId(produto, adiarEtapa)) throw new createHttpError.BadRequest("Etapa inválida para adiar.");
	if (retomarEtapa && !isOnboardingStageId(produto, retomarEtapa)) throw new createHttpError.BadRequest("Etapa inválida para retomar.");

	const deferred = new Set(journey.etapasAdiadas);
	if (adiarEtapa) {
		const definition = getJourneyDefinition(produto).etapas.find((stage) => stage.id === adiarEtapa);
		if (!definition?.adiarRotulo) throw new createHttpError.BadRequest("Esta etapa não pode ser adiada.");
		deferred.add(adiarEtapa);
	}
	if (retomarEtapa) deferred.delete(retomarEtapa);

	const visited = new Set(journey.etapasVisitadas);
	if (etapaAtual) visited.add(etapaAtual);

	const [updated] = await executor
		.update(organizationOnboardings)
		.set({
			etapaAtual: etapaAtual ?? journey.etapaAtual,
			etapasAdiadas: Array.from(deferred),
			etapasVisitadas: Array.from(visited),
			respostas: respostas ? sql`coalesce(${organizationOnboardings.respostas}, '{}'::jsonb) || ${JSON.stringify(respostas)}::jsonb` : organizationOnboardings.respostas,
		})
		.where(eq(organizationOnboardings.id, journey.id))
		.returning();
	return updated;
}

/**
 * Conclui a jornada sem exigir pendências resolvidas. A primeira conclusão da organização
 * também carimba `organizations.dataOnboardingConclusao` (gate do /dashboard). Devolve se foi
 * a primeira, para o chamador disparar os efeitos de boas-vindas uma única vez.
 */
export async function concludeJourney({
	executor,
	organizationId,
	produto,
}: {
	executor: TExecutor;
	organizationId: string;
	produto: TOnboardingProductEnum;
}): Promise<{ journey: TOrganizationOnboardingEntity; firstConclusion: boolean; alreadyConcluded: boolean }> {
	const journey = await getJourney({ executor, organizationId, produto });
	if (!journey) throw new createHttpError.NotFound("Jornada de onboarding não encontrada.");
	if (journey.dataConclusao) return { journey, firstConclusion: false, alreadyConcluded: true };

	const definition = getJourneyDefinition(produto);
	const [updated] = await executor
		.update(organizationOnboardings)
		.set({
			dataConclusao: new Date(),
			etapaAtual: definition.etapaFinal,
			etapasVisitadas: sql`${organizationOnboardings.etapasVisitadas} || ${JSON.stringify([definition.etapaFinal])}::jsonb`,
		})
		.where(eq(organizationOnboardings.id, journey.id))
		.returning();

	const organization = await executor.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: { dataOnboardingConclusao: true },
	});
	const firstConclusion = !organization?.dataOnboardingConclusao;
	if (firstConclusion) {
		await executor.update(organizations).set({ dataOnboardingConclusao: new Date() }).where(eq(organizations.id, organizationId));
	}
	return { journey: updated, firstConclusion, alreadyConcluded: false };
}
