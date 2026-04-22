import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, interactions, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);

const QUOTA_CONSUMING_INTERACTION_STATUSES = ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO"] as const;
const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";
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

export type TCampaignWeeklyBatchQuotaReservationResult = TCampaignWeeklyLimitCheckResult & {
	reservedAt: Date | null;
	claimedInteractionIds: string[];
	blockedInteractionIds: string[];
	alreadyReservedInteractionIds: string[];
	missingInteractionIds: string[];
};

export type TCampaignWeeklyLimitCache = {
	orgUsageByWeekKey: Map<string, number>;
	campaignUsageByWeekKey: Map<string, number>;
	campaignLimitById: Map<
		string,
		{
			organizationWeeklyLimit: number | null;
			campaignWeeklyLimit: number | null;
			campaignEffectiveWeeklyLimit: number | null;
			campaignLimitExceedsOrganizationLimit: boolean;
		}
	>;
};

export function createCampaignWeeklyLimitCache(): TCampaignWeeklyLimitCache {
	return {
		orgUsageByWeekKey: new Map(),
		campaignUsageByWeekKey: new Map(),
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

function getCurrentWeekWindow() {
	const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
	const startOfWeekDate = nowInCronTimezone.startOf("week").toDate();
	const weekReference = dayjs(startOfWeekDate).tz(INTERACTIONS_CRON_TIMEZONE);
	const weekKey = `${weekReference.year()}-W${String(weekReference.week()).padStart(2, "0")}`;

	return {
		startOfWeekDate,
		weekKey,
	};
}

function buildWeeklyLimitCheckResult({
	allowed,
	reason,
	message,
	organizationWeeklyLimit,
	campaignWeeklyLimit,
	campaignEffectiveWeeklyLimit,
	organizationUsedThisWeek,
	campaignUsedThisWeek,
	campaignLimitExceedsOrganizationLimit,
	weekKey,
}: TCampaignWeeklyLimitCheckResult): TCampaignWeeklyLimitCheckResult {
	return {
		allowed,
		reason,
		message,
		organizationWeeklyLimit,
		campaignWeeklyLimit,
		campaignEffectiveWeeklyLimit,
		organizationUsedThisWeek,
		campaignUsedThisWeek,
		campaignLimitExceedsOrganizationLimit,
		weekKey,
	};
}

function buildEmptyWeeklyLimitCheckResult(weekKey: string): TCampaignWeeklyLimitCheckResult {
	return buildWeeklyLimitCheckResult({
		allowed: false,
		reason: null,
		message: null,
		organizationWeeklyLimit: null,
		campaignWeeklyLimit: null,
		campaignEffectiveWeeklyLimit: null,
		organizationUsedThisWeek: 0,
		campaignUsedThisWeek: 0,
		campaignLimitExceedsOrganizationLimit: false,
		weekKey,
	});
}

function getRemainingWeeklyQuota({
	organizationWeeklyLimit,
	campaignEffectiveWeeklyLimit,
	organizationUsedThisWeek,
	campaignUsedThisWeek,
}: {
	organizationWeeklyLimit: number | null;
	campaignEffectiveWeeklyLimit: number | null;
	organizationUsedThisWeek: number;
	campaignUsedThisWeek: number;
}) {
	const remainingOrganizationQuota =
		organizationWeeklyLimit == null ? Number.POSITIVE_INFINITY : Math.max(organizationWeeklyLimit - organizationUsedThisWeek, 0);
	const remainingCampaignQuota =
		campaignEffectiveWeeklyLimit == null ? Number.POSITIVE_INFINITY : Math.max(campaignEffectiveWeeklyLimit - campaignUsedThisWeek, 0);

	return Math.min(remainingOrganizationQuota, remainingCampaignQuota);
}

function getFailureReasonForQuotaState({
	organizationWeeklyLimit,
	campaignEffectiveWeeklyLimit,
	campaignLimitExceedsOrganizationLimit,
	organizationUsedThisWeek,
	campaignUsedThisWeek,
}: {
	organizationWeeklyLimit: number | null;
	campaignEffectiveWeeklyLimit: number | null;
	campaignLimitExceedsOrganizationLimit: boolean;
	organizationUsedThisWeek: number;
	campaignUsedThisWeek: number;
}): TCampaignWeeklyLimitFailureReason {
	if (organizationWeeklyLimit != null && organizationUsedThisWeek >= organizationWeeklyLimit) {
		return "ORG_LIMIT_REACHED";
	}

	if (campaignEffectiveWeeklyLimit != null && campaignUsedThisWeek >= campaignEffectiveWeeklyLimit) {
		return campaignLimitExceedsOrganizationLimit ? "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE" : "CAMPAIGN_LIMIT_REACHED";
	}

	return "CAMPAIGN_LIMIT_REACHED";
}

async function getWeeklyLimitContext({
	executor = db,
	organizationId,
	campaignId,
	cache,
}: {
	executor?: TWeeklyLimitExecutor;
	organizationId: string;
	campaignId: string;
	cache?: TCampaignWeeklyLimitCache;
}) {
	const cached = cache?.campaignLimitById.get(campaignId);
	if (cached) return cached;

	const [organization, campaign] = await Promise.all([
		executor.query.organizations.findFirst({
			where: (fields, { eq }) => eq(fields.id, organizationId),
			columns: { configuracao: true },
		}),
		executor.query.campaigns.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, campaignId), eq(fields.organizacaoId, organizationId)),
			columns: { limiteEnviosSemanais: true },
		}),
	]);

	const organizationWeeklyLimit = organization?.configuracao?.preferencias?.limiteMensagensSemanaisViaCampanhas ?? null;
	const campaignWeeklyLimit = campaign?.limiteEnviosSemanais ?? null;
	const campaignEffectiveWeeklyLimit = getEffectiveCampaignWeeklyLimit({
		organizationWeeklyLimit,
		campaignWeeklyLimit,
	});
	const campaignLimitExceedsOrganizationLimit =
		campaignWeeklyLimit != null && organizationWeeklyLimit != null && campaignWeeklyLimit > organizationWeeklyLimit;

	const result = {
		organizationWeeklyLimit,
		campaignWeeklyLimit,
		campaignEffectiveWeeklyLimit,
		campaignLimitExceedsOrganizationLimit,
	};

	cache?.campaignLimitById.set(campaignId, result);
	return result;
}

async function getOrganizationUsedThisWeek({
	executor = db,
	organizationId,
	weekKey,
	startOfWeekDate,
	cache,
}: {
	executor?: TWeeklyLimitExecutor;
	organizationId: string;
	weekKey: string;
	startOfWeekDate: Date;
	cache?: TCampaignWeeklyLimitCache;
}) {
	const cacheKey = `${organizationId}:${weekKey}`;
	const cached = cache?.orgUsageByWeekKey.get(cacheKey);
	if (cached != null) return cached;

	const [usage] = await executor
		.select({ value: count(interactions.id) })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizationId),
				eq(interactions.tipo, "ENVIO-MENSAGEM"),
				isNotNull(interactions.campanhaId),
				inArray(interactions.statusEnvio, [...QUOTA_CONSUMING_INTERACTION_STATUSES]),
				gte(interactions.dataExecucao, startOfWeekDate),
			),
		);

	const value = Number(usage?.value ?? 0);
	cache?.orgUsageByWeekKey.set(cacheKey, value);
	return value;
}

async function getCampaignUsedThisWeek({
	executor = db,
	organizationId,
	campaignId,
	weekKey,
	startOfWeekDate,
	cache,
}: {
	executor?: TWeeklyLimitExecutor;
	organizationId: string;
	campaignId: string;
	weekKey: string;
	startOfWeekDate: Date;
	cache?: TCampaignWeeklyLimitCache;
}) {
	const cacheKey = `${organizationId}:${campaignId}:${weekKey}`;
	const cached = cache?.campaignUsageByWeekKey.get(cacheKey);
	if (cached != null) return cached;

	const [usage] = await executor
		.select({ value: count(interactions.id) })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizationId),
				eq(interactions.campanhaId, campaignId),
				eq(interactions.tipo, "ENVIO-MENSAGEM"),
				inArray(interactions.statusEnvio, [...QUOTA_CONSUMING_INTERACTION_STATUSES]),
				gte(interactions.dataExecucao, startOfWeekDate),
			),
		);

	const value = Number(usage?.value ?? 0);
	cache?.campaignUsageByWeekKey.set(cacheKey, value);
	return value;
}

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
	const [limitContext, organizationUsedThisWeek, campaignUsedThisWeek] = await Promise.all([
		getWeeklyLimitContext({ executor, organizationId, campaignId, cache }),
		getOrganizationUsedThisWeek({ executor, organizationId, weekKey: effectiveWeekKey, startOfWeekDate: effectiveStartOfWeekDate, cache }),
		getCampaignUsedThisWeek({
			executor,
			organizationId,
			campaignId,
			weekKey: effectiveWeekKey,
			startOfWeekDate: effectiveStartOfWeekDate,
			cache,
		}),
	]);

	const { organizationWeeklyLimit, campaignWeeklyLimit, campaignEffectiveWeeklyLimit, campaignLimitExceedsOrganizationLimit } = limitContext;

	if (organizationWeeklyLimit != null && organizationUsedThisWeek >= organizationWeeklyLimit) {
		return buildWeeklyLimitCheckResult({
			allowed: false,
			reason: "ORG_LIMIT_REACHED",
			message: getCampaignWeeklyLimitFailureMessage("ORG_LIMIT_REACHED"),
			organizationWeeklyLimit,
			campaignWeeklyLimit,
			campaignEffectiveWeeklyLimit,
			organizationUsedThisWeek,
			campaignUsedThisWeek,
			campaignLimitExceedsOrganizationLimit,
			weekKey: effectiveWeekKey,
		});
	}

	if (campaignEffectiveWeeklyLimit != null && campaignUsedThisWeek >= campaignEffectiveWeeklyLimit) {
		const reason: TCampaignWeeklyLimitFailureReason = campaignLimitExceedsOrganizationLimit
			? "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE"
			: "CAMPAIGN_LIMIT_REACHED";

		return buildWeeklyLimitCheckResult({
			allowed: false,
			reason,
			message: getCampaignWeeklyLimitFailureMessage(reason),
			organizationWeeklyLimit,
			campaignWeeklyLimit,
			campaignEffectiveWeeklyLimit,
			organizationUsedThisWeek,
			campaignUsedThisWeek,
			campaignLimitExceedsOrganizationLimit,
			weekKey: effectiveWeekKey,
		});
	}

	return buildWeeklyLimitCheckResult({
		allowed: true,
		reason: null,
		message: null,
		organizationWeeklyLimit,
		campaignWeeklyLimit,
		campaignEffectiveWeeklyLimit,
		organizationUsedThisWeek,
		campaignUsedThisWeek,
		campaignLimitExceedsOrganizationLimit,
		weekKey: effectiveWeekKey,
	});
}

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
	const { startOfWeekDate, weekKey } = getCurrentWeekWindow();
	const reservedAt = new Date();

	const reservationResult = await db.transaction(async (tx) => {
		const [interaction] = await tx
			.select({
				id: interactions.id,
				dataExecucao: interactions.dataExecucao,
			})
			.from(interactions)
			.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId), eq(interactions.campanhaId, campaignId)))
			.for("update");

		if (!interaction) {
			return {
				...buildEmptyWeeklyLimitCheckResult(weekKey),
				status: "INTERACTION_NOT_FOUND" as const,
				reservedAt: null,
				message: "Interação não encontrada para reservar quota semanal.",
			};
		}

		if (interaction.dataExecucao != null) {
			return {
				...buildEmptyWeeklyLimitCheckResult(weekKey),
				status: "ALREADY_RESERVED" as const,
				reservedAt: null,
				message: "Interação já foi reservada ou executada anteriormente.",
			};
		}

		await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).for("update");
		await tx
			.select({ id: campaigns.id })
			.from(campaigns)
			.where(and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, organizationId)))
			.for("update");

		const limitCheck = await checkCampaignWeeklyInteractionLimit({
			executor: tx,
			organizationId,
			campaignId,
			startOfWeekDate,
			weekKey,
		});

		if (!limitCheck.allowed && limitCheck.reason) {
			await tx
				.update(interactions)
				.set({
					statusEnvio: "BLOQUEADA",
					erroEnvio: getCampaignWeeklyLimitFailureMessage(limitCheck.reason),
				})
				.where(eq(interactions.id, interactionId));

			return {
				...limitCheck,
				status: "LIMIT_REACHED" as const,
				reservedAt: null,
			};
		}

		await tx
			.update(interactions)
			.set({
				statusEnvio: "PENDENTE",
				erroEnvio: null,
				dataExecucao: reservedAt,
			})
			.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));

		return {
			...buildWeeklyLimitCheckResult({
				...limitCheck,
				organizationUsedThisWeek: limitCheck.organizationUsedThisWeek + 1,
				campaignUsedThisWeek: limitCheck.campaignUsedThisWeek + 1,
			}),
			status: "RESERVED" as const,
			reservedAt,
		};
	});

	if (reservationResult.status === "RESERVED") {
		incrementCampaignWeeklyLimitUsageCache({
			organizationId,
			campaignId,
			weekKey,
			cache,
		});
	}

	return reservationResult;
}

export async function reserveCampaignWeeklyQuotaBatch({
	interactionIds,
	organizationId,
	campaignId,
	cache,
}: {
	interactionIds: string[];
	organizationId: string;
	campaignId: string;
	cache?: TCampaignWeeklyLimitCache;
}): Promise<TCampaignWeeklyBatchQuotaReservationResult> {
	const uniqueInteractionIds = Array.from(new Set(interactionIds));
	const { startOfWeekDate, weekKey } = getCurrentWeekWindow();
	const reservedAt = new Date();

	if (uniqueInteractionIds.length === 0) {
		return {
			...buildWeeklyLimitCheckResult({
				allowed: true,
				reason: null,
				message: null,
				organizationWeeklyLimit: null,
				campaignWeeklyLimit: null,
				campaignEffectiveWeeklyLimit: null,
				organizationUsedThisWeek: 0,
				campaignUsedThisWeek: 0,
				campaignLimitExceedsOrganizationLimit: false,
				weekKey,
			}),
			reservedAt: null,
			claimedInteractionIds: [],
			blockedInteractionIds: [],
			alreadyReservedInteractionIds: [],
			missingInteractionIds: [],
		};
	}

	const reservationResult = await db.transaction(async (tx) => {
		const lockedInteractions = await tx
			.select({
				id: interactions.id,
				dataExecucao: interactions.dataExecucao,
			})
			.from(interactions)
			.where(
				and(
					eq(interactions.organizacaoId, organizationId),
					eq(interactions.campanhaId, campaignId),
					inArray(interactions.id, uniqueInteractionIds),
				),
			)
			.for("update");

		const lockedInteractionsById = new Map(lockedInteractions.map((interaction) => [interaction.id, interaction]));
		const missingInteractionIds = uniqueInteractionIds.filter((interactionId) => !lockedInteractionsById.has(interactionId));
		const alreadyReservedInteractionIds = uniqueInteractionIds.filter((interactionId) => {
			const interaction = lockedInteractionsById.get(interactionId);
			return interaction?.dataExecucao != null;
		});
		const claimableInteractionIds = uniqueInteractionIds.filter((interactionId) => {
			const interaction = lockedInteractionsById.get(interactionId);
			return interaction != null && interaction.dataExecucao == null;
		});

		await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).for("update");
		await tx
			.select({ id: campaigns.id })
			.from(campaigns)
			.where(and(eq(campaigns.id, campaignId), eq(campaigns.organizacaoId, organizationId)))
			.for("update");

		const limitCheck = await checkCampaignWeeklyInteractionLimit({
			executor: tx,
			organizationId,
			campaignId,
			startOfWeekDate,
			weekKey,
		});

		if (claimableInteractionIds.length === 0) {
			return {
				...limitCheck,
				reservedAt: null,
				claimedInteractionIds: [],
				blockedInteractionIds: [],
				alreadyReservedInteractionIds,
				missingInteractionIds,
			};
		}

		if (!limitCheck.allowed && limitCheck.reason) {
			await tx
				.update(interactions)
				.set({
					statusEnvio: "BLOQUEADA",
					erroEnvio: getCampaignWeeklyLimitFailureMessage(limitCheck.reason),
				})
				.where(
					and(
						eq(interactions.organizacaoId, organizationId),
						eq(interactions.campanhaId, campaignId),
						inArray(interactions.id, claimableInteractionIds),
					),
				);

			return {
				...limitCheck,
				reservedAt: null,
				claimedInteractionIds: [],
				blockedInteractionIds: claimableInteractionIds,
				alreadyReservedInteractionIds,
				missingInteractionIds,
			};
		}

		const remainingQuota = getRemainingWeeklyQuota({
			organizationWeeklyLimit: limitCheck.organizationWeeklyLimit,
			campaignEffectiveWeeklyLimit: limitCheck.campaignEffectiveWeeklyLimit,
			organizationUsedThisWeek: limitCheck.organizationUsedThisWeek,
			campaignUsedThisWeek: limitCheck.campaignUsedThisWeek,
		});
		const claimableCount = Number.isFinite(remainingQuota) ? Math.max(Math.floor(remainingQuota), 0) : claimableInteractionIds.length;
		const claimedInteractionIds = claimableInteractionIds.slice(0, claimableCount);
		const blockedInteractionIds = claimableInteractionIds.slice(claimableCount);

		if (claimedInteractionIds.length > 0) {
			await tx
				.update(interactions)
				.set({
					statusEnvio: "PENDENTE",
					erroEnvio: null,
					dataExecucao: reservedAt,
				})
				.where(
					and(
						eq(interactions.organizacaoId, organizationId),
						eq(interactions.campanhaId, campaignId),
						inArray(interactions.id, claimedInteractionIds),
					),
				);
		}

		const nextOrganizationUsedThisWeek = limitCheck.organizationUsedThisWeek + claimedInteractionIds.length;
		const nextCampaignUsedThisWeek = limitCheck.campaignUsedThisWeek + claimedInteractionIds.length;

		if (blockedInteractionIds.length > 0) {
			const blockingReason = getFailureReasonForQuotaState({
				organizationWeeklyLimit: limitCheck.organizationWeeklyLimit,
				campaignEffectiveWeeklyLimit: limitCheck.campaignEffectiveWeeklyLimit,
				campaignLimitExceedsOrganizationLimit: limitCheck.campaignLimitExceedsOrganizationLimit,
				organizationUsedThisWeek: nextOrganizationUsedThisWeek,
				campaignUsedThisWeek: nextCampaignUsedThisWeek,
			});
			const blockingMessage = getCampaignWeeklyLimitFailureMessage(blockingReason);

			await tx
				.update(interactions)
				.set({
					statusEnvio: "BLOQUEADA",
					erroEnvio: blockingMessage,
				})
				.where(
					and(
						eq(interactions.organizacaoId, organizationId),
						eq(interactions.campanhaId, campaignId),
						inArray(interactions.id, blockedInteractionIds),
					),
				);

			return {
				...buildWeeklyLimitCheckResult({
					allowed: false,
					reason: blockingReason,
					message: blockingMessage,
					organizationWeeklyLimit: limitCheck.organizationWeeklyLimit,
					campaignWeeklyLimit: limitCheck.campaignWeeklyLimit,
					campaignEffectiveWeeklyLimit: limitCheck.campaignEffectiveWeeklyLimit,
					organizationUsedThisWeek: nextOrganizationUsedThisWeek,
					campaignUsedThisWeek: nextCampaignUsedThisWeek,
					campaignLimitExceedsOrganizationLimit: limitCheck.campaignLimitExceedsOrganizationLimit,
					weekKey,
				}),
				reservedAt: claimedInteractionIds.length > 0 ? reservedAt : null,
				claimedInteractionIds,
				blockedInteractionIds,
				alreadyReservedInteractionIds,
				missingInteractionIds,
			};
		}

		return {
			...buildWeeklyLimitCheckResult({
				...limitCheck,
				organizationUsedThisWeek: nextOrganizationUsedThisWeek,
				campaignUsedThisWeek: nextCampaignUsedThisWeek,
			}),
			reservedAt: claimedInteractionIds.length > 0 ? reservedAt : null,
			claimedInteractionIds,
			blockedInteractionIds: [],
			alreadyReservedInteractionIds,
			missingInteractionIds,
		};
	});

	if (reservationResult.claimedInteractionIds.length > 0) {
		incrementCampaignWeeklyLimitUsageCache({
			organizationId,
			campaignId,
			weekKey,
			cache,
			count: reservationResult.claimedInteractionIds.length,
		});
	}

	return reservationResult;
}

export function incrementCampaignWeeklyLimitUsageCache({
	organizationId,
	campaignId,
	weekKey,
	cache,
	count = 1,
}: {
	organizationId: string;
	campaignId: string;
	weekKey: string;
	cache?: TCampaignWeeklyLimitCache;
	count?: number;
}) {
	if (!cache) return;

	const orgKey = `${organizationId}:${weekKey}`;
	const campaignKey = `${organizationId}:${campaignId}:${weekKey}`;

	const currentOrgUsage = cache.orgUsageByWeekKey.get(orgKey) ?? 0;
	const currentCampaignUsage = cache.campaignUsageByWeekKey.get(campaignKey) ?? 0;

	cache.orgUsageByWeekKey.set(orgKey, currentOrgUsage + count);
	cache.campaignUsageByWeekKey.set(campaignKey, currentCampaignUsage + count);
}

export async function markInteractionAsWeeklyLimitFailed({
	interactionId,
	reason,
}: {
	interactionId: string;
	reason: TCampaignWeeklyLimitFailureReason;
}) {
	await db
		.update(interactions)
		.set({
			statusEnvio: "BLOQUEADA",
			erroEnvio: getCampaignWeeklyLimitFailureMessage(reason),
		})
		.where(eq(interactions.id, interactionId));
}
