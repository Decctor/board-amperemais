import { db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";

const SUCCESSFUL_INTERACTION_STATUSES = ["ENVIADO", "ENTREGUE", "LIDO"] as const;

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

async function getWeeklyLimitContext({
  organizationId,
  campaignId,
  cache,
}: {
  organizationId: string;
  campaignId: string;
  cache?: TCampaignWeeklyLimitCache;
}) {
  const cached = cache?.campaignLimitById.get(campaignId);
  if (cached) return cached;

  const [organization, campaign] = await Promise.all([
    db.query.organizations.findFirst({
      where: (fields, { eq }) => eq(fields.id, organizationId),
      columns: { configuracao: true },
    }),
    db.query.campaigns.findFirst({
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
  organizationId,
  weekKey,
  startOfWeekDate,
  cache,
}: {
  organizationId: string;
  weekKey: string;
  startOfWeekDate: Date;
  cache?: TCampaignWeeklyLimitCache;
}) {
  const cacheKey = `${organizationId}:${weekKey}`;
  const cached = cache?.orgUsageByWeekKey.get(cacheKey);
  if (cached != null) return cached;

  const [usage] = await db
    .select({ value: count(interactions.id) })
    .from(interactions)
    .where(
      and(
        eq(interactions.organizacaoId, organizationId),
        eq(interactions.tipo, "ENVIO-MENSAGEM"),
        isNotNull(interactions.campanhaId),
        inArray(interactions.statusEnvio, [...SUCCESSFUL_INTERACTION_STATUSES]),
        gte(interactions.dataExecucao, startOfWeekDate),
      ),
    );

  const value = Number(usage?.value ?? 0);
  cache?.orgUsageByWeekKey.set(cacheKey, value);
  return value;
}

async function getCampaignUsedThisWeek({
  organizationId,
  campaignId,
  weekKey,
  startOfWeekDate,
  cache,
}: {
  organizationId: string;
  campaignId: string;
  weekKey: string;
  startOfWeekDate: Date;
  cache?: TCampaignWeeklyLimitCache;
}) {
  const cacheKey = `${organizationId}:${campaignId}:${weekKey}`;
  const cached = cache?.campaignUsageByWeekKey.get(cacheKey);
  if (cached != null) return cached;

  const [usage] = await db
    .select({ value: count(interactions.id) })
    .from(interactions)
    .where(
      and(
        eq(interactions.organizacaoId, organizationId),
        eq(interactions.campanhaId, campaignId),
        eq(interactions.tipo, "ENVIO-MENSAGEM"),
        inArray(interactions.statusEnvio, [...SUCCESSFUL_INTERACTION_STATUSES]),
        gte(interactions.dataExecucao, startOfWeekDate),
      ),
    );

  const value = Number(usage?.value ?? 0);
  cache?.campaignUsageByWeekKey.set(cacheKey, value);
  return value;
}

export async function checkCampaignWeeklyInteractionLimit({
  organizationId,
  campaignId,
  cache,
}: {
  organizationId: string;
  campaignId: string;
  cache?: TCampaignWeeklyLimitCache;
}): Promise<TCampaignWeeklyLimitCheckResult> {
  const startOfWeekDate = dayjs().startOf("week").toDate();
  const weekKey = dayjs(startOfWeekDate).format("YYYY-[W]WW");
  const [limitContext, organizationUsedThisWeek, campaignUsedThisWeek] = await Promise.all([
    getWeeklyLimitContext({ organizationId, campaignId, cache }),
    getOrganizationUsedThisWeek({ organizationId, weekKey, startOfWeekDate, cache }),
    getCampaignUsedThisWeek({ organizationId, campaignId, weekKey, startOfWeekDate, cache }),
  ]);

  const {
    organizationWeeklyLimit,
    campaignWeeklyLimit,
    campaignEffectiveWeeklyLimit,
    campaignLimitExceedsOrganizationLimit,
  } = limitContext;

  if (organizationWeeklyLimit != null && organizationUsedThisWeek >= organizationWeeklyLimit) {
    return {
      allowed: false,
      reason: "ORG_LIMIT_REACHED",
      message: getCampaignWeeklyLimitFailureMessage("ORG_LIMIT_REACHED"),
      organizationWeeklyLimit,
      campaignWeeklyLimit,
      campaignEffectiveWeeklyLimit,
      organizationUsedThisWeek,
      campaignUsedThisWeek,
      campaignLimitExceedsOrganizationLimit,
      weekKey,
    };
  }

  if (campaignEffectiveWeeklyLimit != null && campaignUsedThisWeek >= campaignEffectiveWeeklyLimit) {
    const reason: TCampaignWeeklyLimitFailureReason = campaignLimitExceedsOrganizationLimit
      ? "CAMPAIGN_LIMIT_EXCEEDS_ORG_EFFECTIVE"
      : "CAMPAIGN_LIMIT_REACHED";

    return {
      allowed: false,
      reason,
      message: getCampaignWeeklyLimitFailureMessage(reason),
      organizationWeeklyLimit,
      campaignWeeklyLimit,
      campaignEffectiveWeeklyLimit,
      organizationUsedThisWeek,
      campaignUsedThisWeek,
      campaignLimitExceedsOrganizationLimit,
      weekKey,
    };
  }

  return {
    allowed: true,
    reason: null,
    message: null,
    organizationWeeklyLimit,
    campaignWeeklyLimit,
    campaignEffectiveWeeklyLimit,
    organizationUsedThisWeek,
    campaignUsedThisWeek,
    campaignLimitExceedsOrganizationLimit,
    weekKey,
  };
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

