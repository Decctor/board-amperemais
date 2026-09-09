import type { TGetCampaignsHealthOutput } from "@/app/api/campaigns/health/route";
import type { TGetExpiringCashbackOutput } from "@/app/api/cashback-programs/expiring/route";
import type { TGetClientBirthdaysOutput } from "@/app/api/clients/birthdays/route";
import type { TGetRecentSegmentChangesOutput } from "@/app/api/segmentations/recent-changes/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/** Consultas dos widgets de relacionamento do dashboard. Cada uma responde a um único cartão. */

async function fetchExpiringCashback(days: number) {
	const { data } = await axios.get<TGetExpiringCashbackOutput>(`/api/cashback-programs/expiring?days=${days}`);
	return data.data;
}

export function useExpiringCashback({ days = 30 }: { days?: number } = {}) {
	const queryKey = ["cashback-expiring", days];
	return { ...useQuery({ queryKey, queryFn: () => fetchExpiringCashback(days) }), queryKey };
}

async function fetchRecentSegmentChanges(days: number) {
	const { data } = await axios.get<TGetRecentSegmentChangesOutput>(`/api/segmentations/recent-changes?days=${days}`);
	return data.data;
}

export function useRecentSegmentChanges({ days = 7 }: { days?: number } = {}) {
	const queryKey = ["segmentations-recent-changes", days];
	return { ...useQuery({ queryKey, queryFn: () => fetchRecentSegmentChanges(days) }), queryKey };
}

async function fetchClientBirthdays(days: number) {
	const { data } = await axios.get<TGetClientBirthdaysOutput>(`/api/clients/birthdays?days=${days}`);
	return data.data;
}

export function useClientBirthdays({ days = 7 }: { days?: number } = {}) {
	const queryKey = ["clients-birthdays", days];
	return { ...useQuery({ queryKey, queryFn: () => fetchClientBirthdays(days) }), queryKey };
}

async function fetchCampaignsHealth(dayStart: Date) {
	const searchParams = new URLSearchParams({ dayStart: dayStart.toISOString() });
	const { data } = await axios.get<TGetCampaignsHealthOutput>(`/api/campaigns/health?${searchParams.toString()}`);
	return data.data;
}

export function useCampaignsHealth({ dayStart }: { dayStart: Date }) {
	const queryKey = ["campaigns-health", dayStart.toISOString()];
	return { ...useQuery({ queryKey, queryFn: () => fetchCampaignsHealth(dayStart), refetchInterval: 120_000 }), queryKey };
}
