import type { TGetReplenishmentInput, TGetReplenishmentOutput } from "@/app/api/replenishment/route";
import type { TGetReplenishmentSettingsOutput } from "@/app/api/replenishment/settings/route";
import type { TGetStockPositionImportsOutput } from "@/app/api/replenishment/stock-imports/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

// Filtros da tela. Os cinco últimos campos são simulação: sobrescrevem a política salva só nesta
// leitura, para a compradora conseguir testar "e se o prazo do fornecedor fosse 30 dias?".
export type TReplenishmentFilters = {
	page: number;
	search: string;
	groups: string[];
	productIds: string[];
	supplierIds: string[];
	status: TGetReplenishmentInput["status"];
	abcClasses: TGetReplenishmentInput["abcClasses"];
	coberturaMaximaDias: number | null;
	coberturaMinimaDias: number | null;
	apenasSugestoes: boolean;
	incluirSobressalentes: boolean;
	incluirDescontinuados: boolean;
	origemEstoque: "SISTEMA" | "IMPORTACAO" | null;
	orderByField: TGetReplenishmentInput["orderByField"];
	orderByDirection: TGetReplenishmentInput["orderByDirection"];
	janelaAnaliseDias: number | null;
	leadTimeDiasPadrao: number | null;
	diasCoberturaAlvo: number | null;
	nivelServico: number | null;
	diasExcessoLimite: number | null;
};

export const DEFAULT_REPLENISHMENT_FILTERS: TReplenishmentFilters = {
	page: 1,
	search: "",
	groups: [],
	productIds: [],
	supplierIds: [],
	status: [],
	abcClasses: [],
	coberturaMaximaDias: null,
	coberturaMinimaDias: null,
	apenasSugestoes: false,
	incluirSobressalentes: true,
	incluirDescontinuados: false,
	origemEstoque: null,
	orderByField: "prioridade",
	orderByDirection: "desc",
	janelaAnaliseDias: null,
	leadTimeDiasPadrao: null,
	diasCoberturaAlvo: null,
	nivelServico: null,
	diasExcessoLimite: null,
};

export function buildReplenishmentSearchParams(filters: TReplenishmentFilters) {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(filters.page));
	if (filters.search) searchParams.set("search", filters.search);
	if (filters.groups.length > 0) searchParams.set("groups", filters.groups.join(","));
	if (filters.productIds.length > 0) searchParams.set("productIds", filters.productIds.join(","));
	if (filters.supplierIds.length > 0) searchParams.set("supplierIds", filters.supplierIds.join(","));
	if (filters.status.length > 0) searchParams.set("status", filters.status.join(","));
	if (filters.abcClasses.length > 0) searchParams.set("abcClasses", filters.abcClasses.join(","));
	if (filters.coberturaMaximaDias != null) searchParams.set("coberturaMaximaDias", String(filters.coberturaMaximaDias));
	if (filters.coberturaMinimaDias != null) searchParams.set("coberturaMinimaDias", String(filters.coberturaMinimaDias));
	if (filters.apenasSugestoes) searchParams.set("apenasSugestoes", "true");
	// O valor padrão do servidor é incluir; só mandamos o parâmetro quando a tela pede o contrário.
	if (!filters.incluirSobressalentes) searchParams.set("incluirSobressalentes", "false");
	if (filters.incluirDescontinuados) searchParams.set("incluirDescontinuados", "true");
	if (filters.origemEstoque) searchParams.set("origemEstoque", filters.origemEstoque);
	searchParams.set("orderByField", filters.orderByField);
	searchParams.set("orderByDirection", filters.orderByDirection);
	if (filters.janelaAnaliseDias != null) searchParams.set("janelaAnaliseDias", String(filters.janelaAnaliseDias));
	if (filters.leadTimeDiasPadrao != null) searchParams.set("leadTimeDiasPadrao", String(filters.leadTimeDiasPadrao));
	if (filters.diasCoberturaAlvo != null) searchParams.set("diasCoberturaAlvo", String(filters.diasCoberturaAlvo));
	if (filters.nivelServico != null) searchParams.set("nivelServico", String(filters.nivelServico));
	if (filters.diasExcessoLimite != null) searchParams.set("diasExcessoLimite", String(filters.diasExcessoLimite));
	return searchParams;
}

async function fetchReplenishment(filters: TReplenishmentFilters) {
	const { data } = await axios.get<TGetReplenishmentOutput>(`/api/replenishment?${buildReplenishmentSearchParams(filters).toString()}`);
	return data.data;
}

export function useReplenishment({ initialFilters }: { initialFilters?: Partial<TReplenishmentFilters> } = {}) {
	const [filters, setFilters] = useState<TReplenishmentFilters>({ ...DEFAULT_REPLENISHMENT_FILTERS, ...initialFilters });

	const updateFilters = useCallback((newFilters: Partial<TReplenishmentFilters>) => {
		setFilters((previous) => ({
			...previous,
			...newFilters,
			// Qualquer mudança de filtro volta para a primeira página: manter a página 7 depois de
			// trocar o fornecedor mostra uma lista vazia que parece um erro.
			page: newFilters.page ?? (Object.keys(newFilters).some((key) => key !== "page") ? 1 : previous.page),
		}));
	}, []);

	const resetFilters = useCallback(() => setFilters(DEFAULT_REPLENISHMENT_FILTERS), []);

	const debouncedFilters = useDebounceMemo(filters, 600);
	const queryKey = ["replenishment", debouncedFilters];

	return {
		...useQuery({ queryKey, queryFn: () => fetchReplenishment(debouncedFilters), placeholderData: (previous) => previous }),
		queryKey,
		filters,
		debouncedFilters,
		updateFilters,
		resetFilters,
	};
}

async function fetchReplenishmentSettings(productIds: string[]) {
	const searchParams = new URLSearchParams();
	if (productIds.length > 0) searchParams.set("productIds", productIds.join(","));
	const { data } = await axios.get<TGetReplenishmentSettingsOutput>(`/api/replenishment/settings?${searchParams.toString()}`);
	return data.data;
}

export function useReplenishmentSettings({ productIds = [] }: { productIds?: string[] } = {}) {
	const queryKey = ["replenishment-settings", productIds];
	return { ...useQuery({ queryKey, queryFn: () => fetchReplenishmentSettings(productIds) }), queryKey };
}

async function fetchStockPositionImports(limit: number) {
	const { data } = await axios.get<TGetStockPositionImportsOutput>(`/api/replenishment/stock-imports?limit=${limit}`);
	return data.data.importacoes;
}

export function useStockPositionImports({ limit = 10 }: { limit?: number } = {}) {
	const queryKey = ["stock-position-imports", limit];
	return { ...useQuery({ queryKey, queryFn: () => fetchStockPositionImports(limit) }), queryKey };
}
