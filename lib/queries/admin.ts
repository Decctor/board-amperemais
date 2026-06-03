import type { TGetOrganizationInput, TGetOrganizationsAdminOutput } from "@/app/api/admin/organizations/route";
import type { TGetAdminStatsOutput } from "@/app/api/admin/stats/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchAdminStats() {
	const response = await axios.get<TGetAdminStatsOutput>("/api/admin/stats");
	return response.data;
}

async function fetchOrganizations(input: TGetOrganizationInput) {
	const searchParams = new URLSearchParams();
	if (input.id) searchParams.set("id", input.id);
	if (input.page) searchParams.set("page", input.page.toString());
	if (input.search) searchParams.set("search", input.search);

	const queryString = searchParams.toString();
	const response = await axios.get<TGetOrganizationsAdminOutput>(`/api/admin/organizations?${queryString}`);
	const defaultResult = response.data.data.default;
	if (!defaultResult) throw new Error("Organizações não encontradas.");
	return defaultResult;
}

async function fetchOrganizationById(id: string) {
	const response = await axios.get<TGetOrganizationsAdminOutput>(`/api/admin/organizations?id=${id}`);
	const byIdResult = response.data.data.byId;
	if (!byIdResult) throw new Error("Organização não encontrada.");
	return byIdResult;
}

export function useAdminStats() {
	return useQuery({
		queryKey: ["admin-stats"],
		queryFn: fetchAdminStats,
	});
}

export function useOrganizations() {
	const [params, setParams] = useState<TGetOrganizationInput>({
		page: 1,
		search: null,
	});

	function updateParams(newParams: Partial<TGetOrganizationInput>) {
		setParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	const debouncedSearch = useDebounceMemo({ search: params.search }, 1000);
	const finalParams = { ...params, ...debouncedSearch };
	return {
		...useQuery({
			queryKey: ["admin-organizations", finalParams],
			queryFn: () => fetchOrganizations(finalParams),
		}),
		queryKey: ["admin-organizations", finalParams],
		params,
		updateParams,
	};
}

export function useOrganizationById({ id }: { id: string }) {
	return useQuery({
		queryKey: ["admin-organization-by-id", id],
		queryFn: () => fetchOrganizationById(id),
	});
}
