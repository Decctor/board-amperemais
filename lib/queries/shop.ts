import type { TGetShopCatalogOutput } from "@/app/api/shop/[orgId]/catalog/route";
import type { TShopClientLookupInput, TShopClientLookupOutput } from "@/app/api/shop/[orgId]/clients/lookup/route";
import type { TGetShopOrdersInput, TGetShopOrdersOutput } from "@/app/api/shop/orders/route";
import type { TGetShopSettingsOutput } from "@/app/api/shop/settings/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "./../hooks/use-debounce";

async function fetchShopCatalog(orgId: string) {
	const { data } = await axios.get<TGetShopCatalogOutput>(`/api/shop/${orgId}/catalog`);
	return data.data;
}

export function useShopCatalog({ orgId }: { orgId: string }) {
	const queryKey = ["shop-catalog", orgId] as const;
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchShopCatalog(orgId),
			enabled: !!orgId,
			refetchInterval: 60_000,
		}),
		queryKey,
	};
}

async function fetchShopClientLookup({ orgId, input }: { orgId: string; input: TShopClientLookupInput }) {
	const { data } = await axios.post<TShopClientLookupOutput>(`/api/shop/${orgId}/clients/lookup`, input);
	return data.data;
}

export function useShopClientLookup({ orgId, telefone }: { orgId: string; telefone: string }) {
	const debouncedInput = useDebounceMemo({ orgId, telefone }, 700);
	const queryKey = ["shop-client-lookup", debouncedInput] as const;
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchShopClientLookup({ orgId: debouncedInput.orgId, input: { telefone: debouncedInput.telefone } }),
			enabled: !!debouncedInput.orgId && debouncedInput.telefone.replace(/\D/g, "").length >= 10,
		}),
		queryKey,
	};
}

async function fetchShopSettings() {
	const { data } = await axios.get<TGetShopSettingsOutput>("/api/shop/settings");
	return data.data;
}

export function useShopSettings() {
	const queryKey = ["shop-settings"] as const;
	return {
		...useQuery({
			queryKey,
			queryFn: fetchShopSettings,
		}),
		queryKey,
	};
}

async function fetchShopOrders(input: TGetShopOrdersInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("page", input.page.toString());
	if (input.status) searchParams.set("status", input.status);
	if (input.statusAtendimento) searchParams.set("statusAtendimento", input.statusAtendimento);
	if (input.search) searchParams.set("search", input.search);
	const { data } = await axios.get<TGetShopOrdersOutput>(`/api/shop/orders?${searchParams.toString()}`);
	return data.data;
}

export function useShopOrders(initialParams?: Partial<TGetShopOrdersInput>) {
	const [params, setParams] = useState<TGetShopOrdersInput>({
		page: initialParams?.page ?? 1,
		status: initialParams?.status ?? "ORCAMENTO",
		statusAtendimento: initialParams?.statusAtendimento ?? null,
		search: initialParams?.search ?? null,
	});
	const debouncedParams = useDebounceMemo(params, 400);
	const queryKey = ["shop-orders", debouncedParams] as const;

	function updateParams(newParams: Partial<TGetShopOrdersInput>) {
		setParams((prev) => ({ ...prev, ...newParams }));
	}

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchShopOrders(debouncedParams),
		}),
		queryKey,
		params,
		updateParams,
	};
}
