import dayjs from "dayjs";

import { metaGraphGet, metaGraphGetByFullUrl } from "./client";
import type {
	TMetaAdsAccountDailySpendPoint,
	TMetaAdsAccountResults,
	TMetaAdsActionStat,
	TMetaAdsAdDailyMetrics,
	TMetaAdsAdDetailResult,
	TMetaAdsAdLevelInsightsRow,
	TMetaAdsCampaignResults,
	TMetaAdsInsightRow,
	TMetaAdsIntegrationConfigWithToken,
	TMetaAdsPurchaseRoasStat,
	TNormalizedMetaAdsMetrics,
} from "./types";

const INSIGHTS_FIELDS = [
	"account_id",
	"account_name",
	"date_start",
	"date_stop",
	"impressions",
	"reach",
	"clicks",
	"inline_link_clicks",
	"spend",
	"cpc",
	"cpm",
	"ctr",
	"frequency",
	"actions",
	"action_values",
	"purchase_roas",
] as const;

const CAMPAIGN_INSIGHTS_FIELDS = ["campaign_id", "campaign_name", ...INSIGHTS_FIELDS] as const;

const AD_INSIGHTS_FIELDS = ["ad_id", "ad_name", ...INSIGHTS_FIELDS] as const;

type MetaAdsInsightsResponse = {
	data?: TMetaAdsInsightRow[];
	paging?: { next?: string };
};

const ACCOUNT_DAILY_SPEND_FIELDS = ["date_start", "spend"] as const;

async function fetchMetaAdsInsightRowsPaged(path: string, params: Record<string, string>, accessToken: string): Promise<TMetaAdsInsightRow[]> {
	const rows: TMetaAdsInsightRow[] = [];
	const first = await metaGraphGet<MetaAdsInsightsResponse>(path, params, accessToken);
	rows.push(...(first.data ?? []));
	let nextUrl = first.paging?.next;
	while (nextUrl) {
		const page = await metaGraphGetByFullUrl<MetaAdsInsightsResponse>(nextUrl);
		rows.push(...(page.data ?? []));
		nextUrl = page.paging?.next;
	}
	return rows;
}

function toNumber(value: string | undefined): number {
	if (!value) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function isLeadAction(actionType: string) {
	const normalized = actionType.toLowerCase();
	return normalized === "lead" || normalized.includes("lead") || normalized.includes("onsite_conversion.lead");
}

function isPurchaseAction(actionType: string) {
	return actionType.toLowerCase().includes("purchase");
}

// A Meta retorna a MESMA conversão em vários `action_type` sobrepostos (ex.: uma venda aparece como
// `omni_purchase` + `offsite_conversion.fb_pixel_purchase` + `purchase` + ...). Somar todos multiplica a
// receita. Escolhemos UM tipo canônico por ordem de prioridade. `omni_purchase` é o total consolidado
// cross-canal — bate exatamente com o `purchase_roas` nativo da Meta.
const PURCHASE_ACTION_PRIORITY = ["omni_purchase", "offsite_conversion.fb_pixel_purchase", "purchase"] as const;
// Idem para leads: `lead` é o total deduplicado. Os `*_add_meta_leads` (content view, search, registration)
// NÃO são leads — são breakdowns de campanhas de lead e inflam a contagem se somados.
const LEAD_ACTION_PRIORITY = ["lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "onsite_web_lead"] as const;

/** Retorna o valor do primeiro `action_type` presente na ordem de prioridade (dedupe), ou 0. */
function pickCanonicalActionValue(stats: TMetaAdsActionStat[] | undefined, priority: readonly string[]): number {
	if (!stats || stats.length === 0) return 0;
	for (const type of priority) {
		const match = stats.find((stat) => (stat.action_type ?? "") === type);
		if (match) return toNumber(match.value);
	}
	return 0;
}

/**
 * DIAGNÓSTICO (temporário): loga a decomposição bruta de compras/leads que a Meta retornou,
 * para identificar sobreposição de `action_type` (ex.: `omni_purchase` + `offsite_conversion.fb_pixel_purchase`
 * + `purchase` representando a MESMA venda). Ative com META_ADS_DEBUG_INSIGHTS=true.
 * Remover após definir a política de dedupe.
 */
const DEBUG_INSIGHTS = process.env.META_ADS_DEBUG_INSIGHTS === "true";

function logInsightActionBreakdown(context: string, row: TMetaAdsInsightRow) {
	if (!DEBUG_INSIGHTS) return;

	const purchaseCounts = (row.actions ?? []).filter((a) => isPurchaseAction(a.action_type ?? ""));
	const purchaseValues = (row.action_values ?? []).filter((a) => isPurchaseAction(a.action_type ?? ""));
	const leadCounts = (row.actions ?? []).filter((a) => isLeadAction(a.action_type ?? ""));

	console.log(`[DEBUG] [META_ADS] Action breakdown (${context}):`, {
		spend: toNumber(row.spend),
		purchaseValueTypes: purchaseValues.map((a) => ({ type: a.action_type, value: toNumber(a.value) })),
		purchaseValueSumOld: sumActionValues(row.action_values, isPurchaseAction),
		purchaseValueCanonical: pickCanonicalActionValue(row.action_values, PURCHASE_ACTION_PRIORITY),
		purchaseCountTypes: purchaseCounts.map((a) => ({ type: a.action_type, value: toNumber(a.value) })),
		purchaseCountSumOld: sumActionValues(row.actions, isPurchaseAction),
		purchaseCountCanonical: pickCanonicalActionValue(row.actions, PURCHASE_ACTION_PRIORITY),
		leadTypes: leadCounts.map((a) => ({ type: a.action_type, value: toNumber(a.value) })),
		leadSumOld: sumActionValues(row.actions, isLeadAction),
		leadCanonical: pickCanonicalActionValue(row.actions, LEAD_ACTION_PRIORITY),
		purchaseRoas: row.purchase_roas?.map((r) => ({ type: r.action_type, value: toNullableNumber(r.value) })),
		allActionValueTypes: (row.action_values ?? []).map((a) => a.action_type),
	});
}

function sumActionValues(actions: { action_type?: string; value?: string }[] | undefined, predicate: (actionType: string) => boolean) {
	if (!actions) return 0;
	return actions.reduce((total, action) => {
		const actionType = action.action_type ?? "";
		if (!predicate(actionType)) return total;
		return total + toNumber(action.value);
	}, 0);
}

function getPurchaseRoas(purchaseRoas: TMetaAdsPurchaseRoasStat[] | undefined): number | null {
	if (!purchaseRoas || purchaseRoas.length === 0) return null;
	const purchase = purchaseRoas.find((item) => isPurchaseAction(item.action_type ?? "")) ?? purchaseRoas[0];
	return toNullableNumber(purchase?.value);
}

export function normalizeMetaAdsInsight(row: TMetaAdsInsightRow): TNormalizedMetaAdsMetrics {
	return {
		impressions: toNumber(row.impressions),
		reach: toNumber(row.reach),
		clicks: toNumber(row.clicks),
		inlineLinkClicks: toNumber(row.inline_link_clicks),
		spend: toNumber(row.spend),
		cpc: toNullableNumber(row.cpc),
		cpm: toNullableNumber(row.cpm),
		ctr: toNullableNumber(row.ctr),
		frequency: toNullableNumber(row.frequency),
		leads: pickCanonicalActionValue(row.actions, LEAD_ACTION_PRIORITY),
		purchases: pickCanonicalActionValue(row.actions, PURCHASE_ACTION_PRIORITY),
		purchaseValue: pickCanonicalActionValue(row.action_values, PURCHASE_ACTION_PRIORITY),
		purchaseRoas: getPurchaseRoas(row.purchase_roas),
	};
}

/** Preenche todos os dias do calendário no intervalo [since, until]; dias sem retorno da Meta viram spend 0. */
export function fillDailySpendGaps(points: TMetaAdsAccountDailySpendPoint[], since: string, until: string): TMetaAdsAccountDailySpendPoint[] {
	const byDate = new Map<string, number>();
	for (const p of points) {
		byDate.set(p.date, p.spend);
	}
	const out: TMetaAdsAccountDailySpendPoint[] = [];
	let cursor = dayjs(since);
	const end = dayjs(until);
	while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
		const key = cursor.format("YYYY-MM-DD");
		out.push({ date: key, spend: byDate.get(key) ?? 0 });
		cursor = cursor.add(1, "day");
	}
	return out;
}

/** Série diária de gasto na conta (granularidade de 1 dia, conforme `time_increment` da Meta). */
export async function fetchMetaAdsAccountDailySpend(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	since: string;
	until: string;
}): Promise<TMetaAdsAccountDailySpendPoint[]> {
	const rows = await fetchMetaAdsInsightRowsPaged(
		`/${params.config.adAccountId}/insights`,
		{
			level: "account",
			time_range: JSON.stringify({ since: params.since, until: params.until }),
			fields: ACCOUNT_DAILY_SPEND_FIELDS.join(","),
			time_increment: "1",
			use_unified_attribution_setting: "true",
			limit: "1000",
		},
		params.config.accessToken,
	);

	const points: TMetaAdsAccountDailySpendPoint[] = rows
		.map((row) => ({
			date: row.date_start ?? "",
			spend: toNumber(row.spend),
		}))
		.filter((point) => point.date.length > 0);

	points.sort((a, b) => a.date.localeCompare(b.date));
	return fillDailySpendGaps(points, params.since, params.until);
}

export async function fetchMetaAdsAccountInsights(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	integrationId: string;
	since: string;
	until: string;
}): Promise<TMetaAdsAccountResults> {
	const response = await metaGraphGet<MetaAdsInsightsResponse>(
		`/${params.config.adAccountId}/insights`,
		{
			level: "account",
			time_range: JSON.stringify({ since: params.since, until: params.until }),
			fields: INSIGHTS_FIELDS.join(","),
			use_unified_attribution_setting: "true",
		},
		params.config.accessToken,
	);

	const row = response.data?.[0] ?? {};
	logInsightActionBreakdown(`account ${params.config.adAccountName} [${params.since}→${params.until}]`, row);
	return {
		integrationId: params.integrationId,
		adAccountId: params.config.adAccountId,
		adAccountName: params.config.adAccountName,
		accountId: row.account_id,
		accountName: row.account_name,
		dateStart: row.date_start,
		dateStop: row.date_stop,
		...normalizeMetaAdsInsight(row),
		raw: {
			actions: row.actions,
			action_values: row.action_values,
			purchase_roas: row.purchase_roas,
		},
	};
}

export async function fetchMetaAdsCampaignInsights(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	integrationId: string;
	since: string;
	until: string;
}): Promise<TMetaAdsCampaignResults[]> {
	const response = await metaGraphGet<MetaAdsInsightsResponse>(
		`/${params.config.adAccountId}/insights`,
		{
			level: "campaign",
			time_range: JSON.stringify({ since: params.since, until: params.until }),
			fields: CAMPAIGN_INSIGHTS_FIELDS.join(","),
			use_unified_attribution_setting: "true",
			limit: "100",
		},
		params.config.accessToken,
	);

	return (response.data ?? []).map((row) => {
		logInsightActionBreakdown(`campaign ${row.campaign_name ?? row.campaign_id}`, row);
		return {
		integrationId: params.integrationId,
		adAccountId: params.config.adAccountId,
		adAccountName: params.config.adAccountName,
		campaignId: row.campaign_id,
		campaignName: row.campaign_name,
		dateStart: row.date_start,
		dateStop: row.date_stop,
		...normalizeMetaAdsInsight(row),
		raw: {
			actions: row.actions,
			action_values: row.action_values,
			purchase_roas: row.purchase_roas,
		},
		};
	});
}

/** Uma linha por anúncio no intervalo (métricas agregadas no período). Usa paginação automática. */
export async function fetchMetaAdsAdLevelInsights(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	integrationId: string;
	since: string;
	until: string;
}): Promise<TMetaAdsAdLevelInsightsRow[]> {
	const rows = await fetchMetaAdsInsightRowsPaged(
		`/${params.config.adAccountId}/insights`,
		{
			level: "ad",
			time_range: JSON.stringify({ since: params.since, until: params.until }),
			fields: AD_INSIGHTS_FIELDS.join(","),
			use_unified_attribution_setting: "true",
			limit: "500",
		},
		params.config.accessToken,
	);

	const result: TMetaAdsAdLevelInsightsRow[] = [];
	for (const row of rows) {
		const adId = row.ad_id ?? "";
		if (!adId) continue;
		logInsightActionBreakdown(`ad ${row.ad_name ?? adId}`, row);
		result.push({
			integrationId: params.integrationId,
			adAccountId: params.config.adAccountId,
			adAccountName: params.config.adAccountName,
			adId,
			adName: row.ad_name,
			dateStart: row.date_start,
			dateStop: row.date_stop,
			...normalizeMetaAdsInsight(row),
			raw: {
				actions: row.actions,
				action_values: row.action_values,
				purchase_roas: row.purchase_roas,
			},
		});
	}
	return result;
}

export async function fetchMetaAdsAdDetail(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	adId: string;
	since: string;
	until: string;
}): Promise<TMetaAdsAdDetailResult> {
	const timeRange = JSON.stringify({ since: params.since, until: params.until });
	const fields = INSIGHTS_FIELDS.join(",");

	const [summaryResponse, dailyResponse] = await Promise.all([
		metaGraphGet<MetaAdsInsightsResponse>(
			`/${params.adId}/insights`,
			{ time_range: timeRange, fields, use_unified_attribution_setting: "true" },
			params.config.accessToken,
		),
		metaGraphGet<MetaAdsInsightsResponse>(
			`/${params.adId}/insights`,
			{ time_range: timeRange, fields, time_increment: "1", use_unified_attribution_setting: "true" },
			params.config.accessToken,
		),
	]);

	const summaryRow = summaryResponse.data?.[0] ?? {};
	const daily: TMetaAdsAdDailyMetrics[] = (dailyResponse.data ?? []).map((row) => ({
		date: row.date_start ?? "",
		...normalizeMetaAdsInsight(row),
	}));

	return { adId: params.adId, summary: normalizeMetaAdsInsight(summaryRow), daily };
}
