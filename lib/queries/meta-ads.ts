import type { TGetMetaAdsAdDetailOutput } from "@/app/api/integrations/meta/ads/ad/route";
import type { TGetMetaAdsInsightsOutput } from "@/app/api/integrations/meta/ads/insights/route";
import type { TGetMetaAdsLibraryOutput } from "@/app/api/integrations/meta/ads/library/route";
import type { TGetMetaAdsSpendSeriesOutput } from "@/app/api/integrations/meta/ads/spend-series/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type MetaAdsPeriod = { integrationId?: string | null; since?: string | null; until?: string | null };

function buildParams(params: Record<string, string | null | undefined>) {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value) search.set(key, value);
	}
	return search.toString();
}

async function fetchMetaAdsInsights(period: MetaAdsPeriod & { level: "account" | "campaign" | "ad" }) {
	const qs = buildParams({ integrationId: period.integrationId, level: period.level, since: period.since, until: period.until });
	const { data } = await axios.get<TGetMetaAdsInsightsOutput>(`/api/integrations/meta/ads/insights?${qs}`);
	return data.data;
}

export function useMetaAdsInsights({
	integrationId,
	since,
	until,
	level = "account",
	enabled = true,
}: MetaAdsPeriod & { level?: "account" | "campaign" | "ad"; enabled?: boolean }) {
	const queryKey = ["meta-ads-insights", integrationId ?? "default", level, since ?? "", until ?? ""];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchMetaAdsInsights({ integrationId, since, until, level }),
			enabled: enabled && !!integrationId,
		}),
		queryKey,
	};
}

async function fetchMetaAdsSpendSeries(period: MetaAdsPeriod) {
	const qs = buildParams({ integrationId: period.integrationId, since: period.since, until: period.until });
	const { data } = await axios.get<TGetMetaAdsSpendSeriesOutput>(`/api/integrations/meta/ads/spend-series?${qs}`);
	return data.data.series;
}

export function useMetaAdsSpendSeries({ integrationId, since, until, enabled = true }: MetaAdsPeriod & { enabled?: boolean }) {
	const queryKey = ["meta-ads-spend-series", integrationId ?? "default", since ?? "", until ?? ""];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchMetaAdsSpendSeries({ integrationId, since, until }),
			enabled: enabled && !!integrationId,
		}),
		queryKey,
	};
}

async function fetchMetaAdsLibrary(params: { integrationId?: string | null; status?: "all" | "active" | "paused" }) {
	const qs = buildParams({ integrationId: params.integrationId, status: params.status });
	const { data } = await axios.get<TGetMetaAdsLibraryOutput>(`/api/integrations/meta/ads/library?${qs}`);
	return data.data.ads;
}

export function useMetaAdsLibrary({
	integrationId,
	status = "all",
	enabled = true,
}: {
	integrationId?: string | null;
	status?: "all" | "active" | "paused";
	enabled?: boolean;
}) {
	const queryKey = ["meta-ads-library", integrationId ?? "default", status];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchMetaAdsLibrary({ integrationId, status }),
			enabled: enabled && !!integrationId,
		}),
		queryKey,
	};
}

async function fetchMetaAdsAdDetail(params: MetaAdsPeriod & { adId: string }) {
	const qs = buildParams({ id: params.adId, integrationId: params.integrationId, since: params.since, until: params.until });
	const { data } = await axios.get<TGetMetaAdsAdDetailOutput>(`/api/integrations/meta/ads/ad?${qs}`);
	return data.data.byId;
}

export function useMetaAdsAdDetail({ adId, integrationId, since, until, enabled = true }: MetaAdsPeriod & { adId: string; enabled?: boolean }) {
	const queryKey = ["meta-ads-ad-detail", adId, integrationId ?? "default", since ?? "", until ?? ""];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchMetaAdsAdDetail({ adId, integrationId, since, until }),
			enabled: enabled && !!adId,
		}),
		queryKey,
	};
}
