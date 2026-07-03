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
// Active (ABERTA) session for a given responsável — drives the sale-flow gate
// ============================================================================

async function fetchActiveSalesSession(vendedorId: string) {
	const { data } = await axios.get<TGetSalesSessionsOutput>(`/api/pos/sales-sessions?status=ABERTA&responsavelVendedorId=${vendedorId}`);
	const sessions = data.data.default?.sessions ?? [];
	return sessions[0] ?? null;
}

/**
 * Resolve a sessão ABERTA do vendedor responsável (escopo OPERADOR). Retorna null quando não há
 * caixa aberto ou quando a feature está desabilitada. React Query deduplica pela queryKey, então
 * a página e o widget podem consumir isto sem requisições duplicadas.
 */
export function useActiveSalesSession({ vendedorId, enabled = true }: { vendedorId: string | null | undefined; enabled?: boolean }) {
	const queryKey = ["active-sales-session", vendedorId ?? null];
	const query = useQuery({
		queryKey,
		queryFn: () => fetchActiveSalesSession(vendedorId as string),
		enabled: enabled && !!vendedorId,
	});
	return { ...query, queryKey, session: query.data ?? null };
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
