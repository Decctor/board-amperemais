import type { TGetPartnersInput, TGetPartnersOutput } from "@/app/api/partners/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchPartners(input: TGetPartnersInput) {
	const searchParams = new URLSearchParams();
	if (input.search) searchParams.set("search", input.search);
	if (input.statsPeriodAfter) searchParams.set("statsPeriodAfter", input.statsPeriodAfter.toISOString());
	if (input.statsPeriodBefore) searchParams.set("statsPeriodBefore", input.statsPeriodBefore.toISOString());
	const { data } = await axios.get<TGetPartnersOutput>(`/api/partners?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Parceiros não encontrados.");
	return result;
}

type UsePartnersParams = {
	initialParams: Partial<TGetPartnersInput>;
};
export function usePartners({ initialParams }: UsePartnersParams) {
	const [queryParams, setQueryParams] = useState<TGetPartnersInput>({
		search: initialParams.search || "",
		statsPeriodAfter: initialParams.statsPeriodAfter || null,
		statsPeriodBefore: initialParams.statsPeriodBefore || null,
	});

	function updateQueryParams(newParams: Partial<TGetPartnersInput>) {
		setQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	const debouncedQueryParams = useDebounceMemo(queryParams, 500);
	return {
		...useQuery({
			queryKey: ["partners", debouncedQueryParams],
			queryFn: () => fetchPartners(debouncedQueryParams),
		}),
		queryKey: ["partners", debouncedQueryParams],
		queryParams,
		updateQueryParams,
	};
}

async function fetchPartnerById({ id }: { id: string }) {
	const { data } = await axios.get<TGetPartnersOutput>(`/api/partners?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Parceiro não encontrado.");
	return result;
}

export function usePartnerById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["partner-by-id", id],
			queryFn: () => fetchPartnerById({ id }),
		}),
		queryKey: ["partner-by-id", id],
	};
}
