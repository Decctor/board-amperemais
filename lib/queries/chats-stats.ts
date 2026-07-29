import type { TGetChatsStatsOverviewOutput } from "@/app/api/chats/stats/overview/route";
import type { TGetChatsStatsTimeseriesOutput } from "@/app/api/chats/stats/timeseries/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type TChatsStatsPeriod = {
	startDate: Date;
	endDate: Date;
	comparingStartDate?: Date | null;
	comparingEndDate?: Date | null;
	whatsappConexaoTelefoneId?: string | null;
};

export type TChatsStatsOverview = TGetChatsStatsOverviewOutput["data"];
export type TChatsStatsTimeseries = TGetChatsStatsTimeseriesOutput["data"];

/** As estatísticas mudam devagar; refazer a varredura a cada foco de janela não paga. */
const STATS_STALE_TIME_MS = 5 * 60 * 1000;

function buildStatsSearchParams(period: TChatsStatsPeriod, { withComparison }: { withComparison: boolean }) {
	const searchParams = new URLSearchParams();
	searchParams.set("startDate", period.startDate.toISOString());
	searchParams.set("endDate", period.endDate.toISOString());
	if (withComparison && period.comparingStartDate) searchParams.set("comparingStartDate", period.comparingStartDate.toISOString());
	if (withComparison && period.comparingEndDate) searchParams.set("comparingEndDate", period.comparingEndDate.toISOString());
	if (period.whatsappConexaoTelefoneId) searchParams.set("whatsappConexaoTelefoneId", period.whatsappConexaoTelefoneId);
	return searchParams;
}

function periodQueryKeyPart(period: TChatsStatsPeriod) {
	return [
		period.startDate.toISOString(),
		period.endDate.toISOString(),
		period.comparingStartDate?.toISOString() ?? null,
		period.comparingEndDate?.toISOString() ?? null,
		period.whatsappConexaoTelefoneId ?? null,
	] as const;
}

async function fetchChatsStatsOverview(period: TChatsStatsPeriod) {
	const searchParams = buildStatsSearchParams(period, { withComparison: true });
	const { data } = await axios.get<TGetChatsStatsOverviewOutput>(`/api/chats/stats/overview?${searchParams.toString()}`);
	return data.data;
}

export function useChatsStatsOverview({ period, enabled = true }: { period: TChatsStatsPeriod; enabled?: boolean }) {
	const queryKey = ["chats-stats-overview", ...periodQueryKeyPart(period)] as const;
	return {
		...useQuery({ queryKey, queryFn: () => fetchChatsStatsOverview(period), enabled, staleTime: STATS_STALE_TIME_MS }),
		queryKey,
	};
}

async function fetchChatsStatsTimeseries(period: TChatsStatsPeriod) {
	const searchParams = buildStatsSearchParams(period, { withComparison: false });
	const { data } = await axios.get<TGetChatsStatsTimeseriesOutput>(`/api/chats/stats/timeseries?${searchParams.toString()}`);
	return data.data;
}

export function useChatsStatsTimeseries({ period, enabled = true }: { period: TChatsStatsPeriod; enabled?: boolean }) {
	const queryKey = ["chats-stats-timeseries", ...periodQueryKeyPart(period)] as const;
	return {
		...useQuery({ queryKey, queryFn: () => fetchChatsStatsTimeseries(period), enabled, staleTime: STATS_STALE_TIME_MS }),
		queryKey,
	};
}
