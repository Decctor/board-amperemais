import type { TGetOrganizationsOutput } from "@/app/api/admin/organizations/route";
import type { TGetAdminStatsOutput } from "@/app/api/admin/stats/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchAdminStats() {
	const response = await axios.get<TGetAdminStatsOutput>("/api/admin/stats");
	return response.data;
}

async function fetchOrganizations() {
	const response = await axios.get<TGetOrganizationsOutput>("/api/admin/organizations");
	return response.data;
}

export function useAdminStats() {
	return useQuery({
		queryKey: ["admin-stats"],
		queryFn: fetchAdminStats,
	});
}

export function useOrganizations() {
	return useQuery({
		queryKey: ["admin-organizations"],
		queryFn: fetchOrganizations,
	});
}
