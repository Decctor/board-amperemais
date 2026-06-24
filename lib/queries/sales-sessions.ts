import type { TGetSalesSessionsInput, TGetSalesSessionsOutput, TGetSalesSessionsOutputById } from "@/app/api/pos/sales-sessions/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

// ============================================================================
// Sales session by ID (resumo / fechamento)
// ============================================================================

async function fetchSalesSessionById(id: string): Promise<TGetSalesSessionsOutputById> {
	const { data } = await axios.get<TGetSalesSessionsOutput>(`/api/pos/sales-sessions?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Sessao de venda nao encontrada.");
	return result;
}

export function useSalesSessionById({ sessionId }: { sessionId: string }) {
	const queryKey = ["sales-session-by-id", sessionId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchSalesSessionById(sessionId),
			enabled: !!sessionId,
		}),
		queryKey,
	};
}

// ============================================================================
// Sales sessions list (paginada)
// ============================================================================

type SalesSessionsListParams = {
	page: number;
	status: TGetSalesSessionsInput["status"];
	responsavelVendedorId: string | null;
};

async function fetchSalesSessions(params: SalesSessionsListParams) {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", params.page.toString());
	if (params.status) searchParams.set("status", params.status);
	if (params.responsavelVendedorId) searchParams.set("responsavelVendedorId", params.responsavelVendedorId);

	const { data } = await axios.get<TGetSalesSessionsOutput>(`/api/pos/sales-sessions?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Erro ao listar sessoes de venda.");
	return result;
}

export function useSalesSessions({ initialParams }: { initialParams?: Partial<SalesSessionsListParams> } = {}) {
	const [params, setParams] = useState<SalesSessionsListParams>({
		page: initialParams?.page ?? 1,
		status: initialParams?.status ?? null,
		responsavelVendedorId: initialParams?.responsavelVendedorId ?? null,
	});

	function updateParams(newParams: Partial<SalesSessionsListParams>) {
		setParams((prev) => ({ ...prev, ...newParams, page: newParams.page ?? 1 }));
	}

	const debouncedParams = useDebounceMemo(params, 300);
	const queryKey = ["sales-sessions", debouncedParams];

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchSalesSessions(debouncedParams),
		}),
		queryKey,
		params,
		updateParams,
		debouncedParams,
	};
}
