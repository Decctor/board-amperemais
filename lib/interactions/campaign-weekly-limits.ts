import { reverseCampaignCashbackForBlockedInteractions } from "@/lib/cashback/reverse-campaign-cashback";
import { type DBTransaction, db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import {
	applyWeeklySendCounterUsage,
	ensureWeeklySendCounters,
	getCurrentWeekWindow,
	getWeeklySendUsage,
	lockWeeklySendCountersForUpdate,
} from "./weekly-send-counters";

type TWeeklyLimitExecutor = typeof db | DBTransaction;

export type TCampaignWeeklyLimitFailureReason = "ORG_LIMIT_REACHED" | "CAMPAIGN_LIMIT_REACHED" | "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE";

export type TCampaignWeeklyLimitCheckResult = {
	allowed: boolean;
	reason: TCampaignWeeklyLimitFailureReason | null;
	message: string | null;
	organizationWeeklyLimit: number | null;
	campaignWeeklyLimit: number | null;
	campaignEffectiveWeeklyLimit: number | null;
	organizationUsedThisWeek: number;
	campaignUsedThisWeek: number;
	campaignLimitExceedsOrganizationLimit: boolean;
	weekKey: string;
};

export type TCampaignWeeklyQuotaReservationStatus = "RESERVED" | "LIMIT_REACHED" | "ALREADY_RESERVED" | "INTERACTION_NOT_FOUND";

export type TCampaignWeeklyQuotaReservationResult = TCampaignWeeklyLimitCheckResult & {
	status: TCampaignWeeklyQuotaReservationStatus;
	reservedAt: Date | null;
};

type TWeeklyLimitContext = {
	organizationWeeklyLimit: number | null;
	campaignWeeklyLimit: number | null;
	campaignEffectiveWeeklyLimit: number | null;
	campaignLimitExceedsOrganizationLimit: boolean;
};

export type TOrganizationWeeklyBatchQuotaReservationResult = {
	weekKey: string;
	reservedAt: Date | null;
	claimedInteractionIds: string[];
	claimedCountsByCampaignId: Map<string, number>;
	blockedInteractionIds: string[];
	alreadyReservedInteractionIds: string[];
	missingInteractionIds: string[];
	blockedReasonsByInteractionId: Map<string, TCampaignWeeklyLimitFailureReason>;
	blockedMessagesByInteractionId: Map<string, string>;
	// Snapshot pós-reserva, para diagnóstico e para reserveCampaignWeeklyQuota compor seu resultado.
	organizationUsedThisWeek: number;
	campaignUsedThisWeekByCampaignId: Map<string, number>;
	limitContextsByCampaignId: Map<string, TWeeklyLimitContext>;
};

export type TCampaignWeeklyLimitCache = {
	campaignLimitById: Map<string, TWeeklyLimitContext>;
};

export function createCampaignWeeklyLimitCache(): TCampaignWeeklyLimitCache {
	return {
		campaignLimitById: new Map(),
	};
}

export function getCampaignWeeklyLimitFailureMessage(reason: TCampaignWeeklyLimitFailureReason): string {
	if (reason === "CAMPAIGN_LIMIT_REACHED") {
		return "Limite semanal de envios da campanha atingido.";
	}

	if (reason === "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE") {
		return "Limite semanal configurado na campanha excede o limite da organização; envio bloqueado por limite efetivo.";
	}

	return "Limite semanal de envios da organização atingido.";
}

function getEffectiveCampaignWeeklyLimit({
	organizationWeeklyLimit,
	campaignWeeklyLimit,
}: {
	organizationWeeklyLimit: number | null;
	campaignWeeklyLimit: number | null;
}) {
	if (campaignWeeklyLimit == null) return organizationWeeklyLimit;
	if (organizationWeeklyLimit == null) return campaignWeeklyLimit;
	return Math.min(campaignWeeklyLimit, organizationWeeklyLimit);
}

function buildEmptyBatchReservationResult(weekKey: string): TOrganizationWeeklyBatchQuotaReservationResult {
	return {
		weekKey,
		reservedAt: null,
		claimedInteractionIds: [],
		claimedCountsByCampaignId: new Map(),
		blockedInteractionIds: [],
		alreadyReservedInteractionIds: [],
		missingInteractionIds: [],
		blockedReasonsByInteractionId: new Map(),
		blockedMessagesByInteractionId: new Map(),
		organizationUsedThisWeek: 0,
		campaignUsedThisWeekByCampaignId: new Map(),
		limitContextsByCampaignId: new Map(),
	};
}

async function getWeeklyLimitContextsByCampaignIds({
	executor = db,
	organizationId,
	campaignIds,
	cache,
}: {
	executor?: TWeeklyLimitExecutor;
	organizationId: string;
	campaignIds: string[];
	cache?: TCampaignWeeklyLimitCache;
}): Promise<Map<string, TWeeklyLimitContext>> {
	const contextsByCampaignId = new Map<string, TWeeklyLimitContext>();
	const missingCampaignIds: string[] = [];

	for (const campaignId of campaignIds) {
		const cached = cache?.campaignLimitById.get(campaignId);
		if (cached) contextsByCampaignId.set(campaignId, cached);
		else missingCampaignIds.push(campaignId);
	}

	if (missingCampaignIds.length === 0) return contextsByCampaignId;

	const [organization, campaignsResult] = await Promise.all([
		executor.query.organizations.findFirst({
			where: (fields, { eq: eqFilter }) => eqFilter(fields.id, organizationId),
			columns: { configuracao: true },
		}),
		executor.query.campaigns.findMany({
			where: (fields, { and: andFilter, inArray: inArrayFilter }) =>
				andFilter(eq(fields.organizacaoId, organizationId), inArrayFilter(fields.id, missingCampaignIds)),
			columns: {
				id: true,
				limiteEnviosSemanais: true,
			},
		}),
	]);

	const organizationWeeklyLimit = organization?.configuracao?.preferencias?.limiteMensagensSemanaisViaCampanhas ?? null;

	for (const campaign of campaignsResult) {
		const campaignWeeklyLimit = campaign.limiteEnviosSemanais ?? null;
		const context: TWeeklyLimitContext = {
			organizationWeeklyLimit,
			campaignWeeklyLimit,
			campaignEffectiveWeeklyLimit: getEffectiveCampaignWeeklyLimit({ organizationWeeklyLimit, campaignWeeklyLimit }),
			campaignLimitExceedsOrganizationLimit:
				campaignWeeklyLimit != null && organizationWeeklyLimit != null && campaignWeeklyLimit > organizationWeeklyLimit,
		};
		contextsByCampaignId.set(campaign.id, context);
		cache?.campaignLimitById.set(campaign.id, context);
	}

	return contextsByCampaignId;
}

// Checagem somente-leitura sobre os contadores (usada por estatísticas). Garante a existência dos
// contadores da semana (upsert idempotente com backfill preguiçoso) e lê `usados` — sem COUNT(*)
// no hot path e sem locks.
export async function checkCampaignWeeklyInteractionLimit({
	executor = db,
	organizationId,
	campaignId,
	cache,
	startOfWeekDate,
	weekKey,
}: {
	executor?: TWeeklyLimitExecutor;
	organizationId: string;
	campaignId: string;
	cache?: TCampaignWeeklyLimitCache;
	startOfWeekDate?: Date;
	weekKey?: string;
}): Promise<TCampaignWeeklyLimitCheckResult> {
	const weekWindow = getCurrentWeekWindow();
	const effectiveStartOfWeekDate = startOfWeekDate ?? weekWindow.startOfWeekDate;
	const effectiveWeekKey = weekKey ?? weekWindow.weekKey;

	const contexts = await getWeeklyLimitContextsByCampaignIds({ executor, organizationId, campaignIds: [campaignId], cache });
	const limitContext = contexts.get(campaignId) ?? {
		organizationWeeklyLimit: null,
		campaignWeeklyLimit: null,
		campaignEffectiveWeeklyLimit: null,
		campaignLimitExceedsOrganizationLimit: false,
	};

	await ensureWeeklySendCounters({
		executor,
		organizationId,
		campaignIds: [campaignId],
		weekKey: effectiveWeekKey,
		startOfWeekDate: effectiveStartOfWeekDate,
	});
	const usage = await getWeeklySendUsage({ executor, organizationId, campaignId, weekKey: effectiveWeekKey });

	const { organizationWeeklyLimit, campaignWeeklyLimit, campaignEffectiveWeeklyLimit, campaignLimitExceedsOrganizationLimit } = limitContext;

	let reason: TCampaignWeeklyLimitFailureReason | null = null;
	if (organizationWeeklyLimit != null && usage.organizationUsed >= organizationWeeklyLimit) {
		reason = "ORG_LIMIT_REACHED";
	} else if (campaignEffectiveWeeklyLimit != null && usage.campaignUsed >= campaignEffectiveWeeklyLimit) {
		reason = campaignLimitExceedsOrganizationLimit ? "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE" : "CAMPAIGN_LIMIT_REACHED";
	}

	return {
		allowed: reason == null,
		reason,
		message: reason ? getCampaignWeeklyLimitFailureMessage(reason) : null,
		organizationWeeklyLimit,
		campaignWeeklyLimit,
		campaignEffectiveWeeklyLimit,
		organizationUsedThisWeek: usage.organizationUsed,
		campaignUsedThisWeek: usage.campaignUsed,
		campaignLimitExceedsOrganizationLimit,
		weekKey: effectiveWeekKey,
	};
}

// Reserva quota semanal para um lote de interações da organização (campanhas mistas), em uma única
// transação:
//  1. trava as interações em ordem determinística (mesma proteção contra envio duplicado de antes);
//  2. garante e trava os contadores da semana (org primeiro, campanhas ordenadas — ordem fixa);
//  3. concede quota interação a interação em ordem de criação (mesma equidade de antes), sem
//     COUNT(*) e sem locks nas linhas de organizations/campaigns;
//  4. marca as interações concedidas como reservadas (dataExecucao) e as excedentes como BLOQUEADA
//     com estorno de bônus (comportamento mantido até a Fase 2 mover o corte para o enfileiramento).
export async function reserveOrganizationWeeklyQuotaBatch({
	interactionIds,
	organizationId,
	cache,
}: {
	interactionIds: string[];
	organizationId: string;
	cache?: TCampaignWeeklyLimitCache;
}): Promise<TOrganizationWeeklyBatchQuotaReservationResult> {
	const uniqueInteractionIds = Array.from(new Set(interactionIds));
	const { startOfWeekDate, weekKey } = getCurrentWeekWindow();
	const reservedAt = new Date();

	if (uniqueInteractionIds.length === 0) {
		return buildEmptyBatchReservationResult(weekKey);
	}

	return db.transaction(async (tx) => {
		const lockedInteractions = await tx
			.select({
				id: interactions.id,
				campaignId: interactions.campanhaId,
				dataExecucao: interactions.dataExecucao,
			})
			.from(interactions)
			.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, uniqueInteractionIds), isNotNull(interactions.campanhaId)))
			.orderBy(asc(interactions.dataInsercao), asc(interactions.id))
			.for("update");

		const lockedInteractionsById = new Map(lockedInteractions.map((interaction) => [interaction.id, interaction]));
		const missingInteractionIds = uniqueInteractionIds.filter((interactionId) => !lockedInteractionsById.has(interactionId));
		const alreadyReservedInteractionIds = uniqueInteractionIds.filter(
			(interactionId) => lockedInteractionsById.get(interactionId)?.dataExecucao != null,
		);
		const claimableInteractions = lockedInteractions.filter((interaction) => interaction.dataExecucao == null && interaction.campaignId != null);

		if (claimableInteractions.length === 0) {
			return {
				...buildEmptyBatchReservationResult(weekKey),
				alreadyReservedInteractionIds,
				missingInteractionIds,
			};
		}

		const campaignIds = Array.from(
			new Set(claimableInteractions.map((interaction) => interaction.campaignId).filter((campaignId): campaignId is string => !!campaignId)),
		).sort();

		const limitContextsByCampaignId = await getWeeklyLimitContextsByCampaignIds({ executor: tx, organizationId, campaignIds, cache });

		await ensureWeeklySendCounters({ executor: tx, organizationId, campaignIds, weekKey, startOfWeekDate });
		const counters = await lockWeeklySendCountersForUpdate({ tx, organizationId, campaignIds, weekKey });

		let organizationUsedThisWeek = counters.organizationUsed;
		const campaignUsedThisWeekByCampaignId = new Map<string, number>();
		for (const campaignId of campaignIds) {
			campaignUsedThisWeekByCampaignId.set(campaignId, counters.campaignUsedByCampaignId.get(campaignId) ?? 0);
		}

		const claimedInteractionIds: string[] = [];
		const claimedCountsByCampaignId = new Map<string, number>();
		const blockedInteractionIds: string[] = [];
		const blockedReasonsByInteractionId = new Map<string, TCampaignWeeklyLimitFailureReason>();
		const blockedMessagesByInteractionId = new Map<string, string>();

		for (const interaction of claimableInteractions) {
			const campaignId = interaction.campaignId;
			if (!campaignId) continue;

			const limitContext = limitContextsByCampaignId.get(campaignId);
			if (!limitContext) {
				blockedInteractionIds.push(interaction.id);
				blockedMessagesByInteractionId.set(interaction.id, "Campanha nao encontrada para reservar quota semanal.");
				continue;
			}

			const campaignUsedThisWeek = campaignUsedThisWeekByCampaignId.get(campaignId) ?? 0;
			const { organizationWeeklyLimit, campaignEffectiveWeeklyLimit, campaignLimitExceedsOrganizationLimit } = limitContext;
			let blockingReason: TCampaignWeeklyLimitFailureReason | null = null;

			if (organizationWeeklyLimit != null && organizationUsedThisWeek >= organizationWeeklyLimit) {
				blockingReason = "ORG_LIMIT_REACHED";
			} else if (campaignEffectiveWeeklyLimit != null && campaignUsedThisWeek >= campaignEffectiveWeeklyLimit) {
				blockingReason = campaignLimitExceedsOrganizationLimit ? "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE" : "CAMPAIGN_LIMIT_REACHED";
			}

			if (blockingReason) {
				blockedInteractionIds.push(interaction.id);
				blockedReasonsByInteractionId.set(interaction.id, blockingReason);
				blockedMessagesByInteractionId.set(interaction.id, getCampaignWeeklyLimitFailureMessage(blockingReason));
				continue;
			}

			claimedInteractionIds.push(interaction.id);
			organizationUsedThisWeek += 1;
			campaignUsedThisWeekByCampaignId.set(campaignId, campaignUsedThisWeek + 1);
			claimedCountsByCampaignId.set(campaignId, (claimedCountsByCampaignId.get(campaignId) ?? 0) + 1);
		}

		await applyWeeklySendCounterUsage({
			tx,
			organizationId,
			weekKey,
			organizationDelta: claimedInteractionIds.length,
			deltasByCampaignId: claimedCountsByCampaignId,
		});

		if (claimedInteractionIds.length > 0) {
			await tx
				.update(interactions)
				.set({
					statusEnvio: "PENDENTE",
					erroEnvio: null,
					dataExecucao: reservedAt,
				})
				.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, claimedInteractionIds)));
		}

		const blockedMessagesGrouped = new Map<string, string[]>();
		for (const interactionId of blockedInteractionIds) {
			const blockingMessage = blockedMessagesByInteractionId.get(interactionId) ?? "Interacao bloqueada por limite semanal.";
			const interactionIdsForMessage = blockedMessagesGrouped.get(blockingMessage);
			if (interactionIdsForMessage) {
				interactionIdsForMessage.push(interactionId);
				continue;
			}

			blockedMessagesGrouped.set(blockingMessage, [interactionId]);
		}

		for (const [blockingMessage, interactionIdsForMessage] of blockedMessagesGrouped) {
			await tx
				.update(interactions)
				.set({
					statusEnvio: "BLOQUEADA",
					erroEnvio: blockingMessage,
				})
				.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, interactionIdsForMessage)));
		}

		if (blockedInteractionIds.length > 0) {
			await reverseCampaignCashbackForBlockedInteractions({ tx, organizationId, interactionIds: blockedInteractionIds });
		}

		return {
			weekKey,
			reservedAt: claimedInteractionIds.length > 0 ? reservedAt : null,
			claimedInteractionIds,
			claimedCountsByCampaignId,
			blockedInteractionIds,
			alreadyReservedInteractionIds,
			missingInteractionIds,
			blockedReasonsByInteractionId,
			blockedMessagesByInteractionId,
			organizationUsedThisWeek,
			campaignUsedThisWeekByCampaignId,
			limitContextsByCampaignId,
		};
	});
}

// Reserva de quota para uma única interação — caso particular do lote acima.
export async function reserveCampaignWeeklyQuota({
	interactionId,
	organizationId,
	campaignId,
	cache,
}: {
	interactionId: string;
	organizationId: string;
	campaignId: string;
	cache?: TCampaignWeeklyLimitCache;
}): Promise<TCampaignWeeklyQuotaReservationResult> {
	const batchResult = await reserveOrganizationWeeklyQuotaBatch({
		interactionIds: [interactionId],
		organizationId,
		cache,
	});

	const limitContext = batchResult.limitContextsByCampaignId.get(campaignId) ?? {
		organizationWeeklyLimit: null,
		campaignWeeklyLimit: null,
		campaignEffectiveWeeklyLimit: null,
		campaignLimitExceedsOrganizationLimit: false,
	};

	const baseResult: TCampaignWeeklyLimitCheckResult = {
		allowed: false,
		reason: null,
		message: null,
		...limitContext,
		organizationUsedThisWeek: batchResult.organizationUsedThisWeek,
		campaignUsedThisWeek: batchResult.campaignUsedThisWeekByCampaignId.get(campaignId) ?? 0,
		weekKey: batchResult.weekKey,
	};

	if (batchResult.missingInteractionIds.includes(interactionId)) {
		return {
			...baseResult,
			status: "INTERACTION_NOT_FOUND",
			reservedAt: null,
			message: "Interação não encontrada para reservar quota semanal.",
		};
	}

	if (batchResult.alreadyReservedInteractionIds.includes(interactionId)) {
		return {
			...baseResult,
			status: "ALREADY_RESERVED",
			reservedAt: null,
			message: "Interação já foi reservada ou executada anteriormente.",
		};
	}

	if (batchResult.blockedInteractionIds.includes(interactionId)) {
		const reason = batchResult.blockedReasonsByInteractionId.get(interactionId) ?? null;
		return {
			...baseResult,
			reason,
			message: batchResult.blockedMessagesByInteractionId.get(interactionId) ?? (reason ? getCampaignWeeklyLimitFailureMessage(reason) : null),
			status: "LIMIT_REACHED",
			reservedAt: null,
		};
	}

	return {
		...baseResult,
		allowed: true,
		status: "RESERVED",
		reservedAt: batchResult.reservedAt,
	};
}
