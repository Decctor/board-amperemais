import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, interactions, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";

dayjs.extend(weekOfYear);

const QUOTA_CONSUMING_INTERACTION_STATUSES = ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO"] as const;
type TWeeklyLimitExecutor = typeof db | DBTransaction;

export type TCampaignWeeklyLimitFailureReason =
  | "ORG_LIMIT_REACHED"
  | "CAMPAIGN_LIMIT_REACHED"
  | "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE";

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

export type TCampaignWeeklyQuotaReservationStatus =
  | "RESERVED"
  | "LIMIT_REACHED"
  | "ALREADY_RESERVED"
  | "INTERACTION_NOT_FOUND";

export type TCampaignWeeklyQuotaReservationResult = TCampaignWeeklyLimitCheckResult & {
  status: TCampaignWeeklyQuotaReservationStatus;
  reservedAt: Date | null;
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
  const startOfWeekDate = dayjs().startOf("week").toDate();
  const weekReference = dayjs(startOfWeekDate);
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
      where: (fields, { and, eq }) =>
        and(eq(fields.id, campaignId), eq(fields.organizacaoId, organizationId)),
      columns: { limiteEnviosSemanais: true },
    }),
  ]);

  const organizationWeeklyLimit =
    organization?.configuracao?.preferencias?.limiteMensagensSemanaisViaCampanhas ?? null;
  const campaignWeeklyLimit = campaign?.limiteEnviosSemanais ?? null;
  const campaignEffectiveWeeklyLimit = getEffectiveCampaignWeeklyLimit({
    organizationWeeklyLimit,
    campaignWeeklyLimit,
  });
  const campaignLimitExceedsOrganizationLimit =
    campaignWeeklyLimit != null &&
    organizationWeeklyLimit != null &&
    campaignWeeklyLimit > organizationWeeklyLimit;

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

  const {
    organizationWeeklyLimit,
    campaignWeeklyLimit,
    campaignEffectiveWeeklyLimit,
    campaignLimitExceedsOrganizationLimit,
  } = limitContext;

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
      .where(
        and(
          eq(interactions.id, interactionId),
          eq(interactions.organizacaoId, organizationId),
          eq(interactions.campanhaId, campaignId),
        ),
      )
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

    await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .for("update");
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
          statusEnvio: "FALHOU",
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

export function incrementCampaignWeeklyLimitUsageCache({
  organizationId,
  campaignId,
  weekKey,
  cache,
}: {
  organizationId: string;
  campaignId: string;
  weekKey: string;
  cache?: TCampaignWeeklyLimitCache;
}) {
  if (!cache) return;

  const orgKey = `${organizationId}:${weekKey}`;
  const campaignKey = `${organizationId}:${campaignId}:${weekKey}`;

  const currentOrgUsage = cache.orgUsageByWeekKey.get(orgKey) ?? 0;
  const currentCampaignUsage = cache.campaignUsageByWeekKey.get(campaignKey) ?? 0;

  cache.orgUsageByWeekKey.set(orgKey, currentOrgUsage + 1);
  cache.campaignUsageByWeekKey.set(campaignKey, currentCampaignUsage + 1);
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
      statusEnvio: "FALHOU",
      erroEnvio: getCampaignWeeklyLimitFailureMessage(reason),
    })
    .where(eq(interactions.id, interactionId));
}

