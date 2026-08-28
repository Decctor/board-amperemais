import type { TGetAgentConnectionOptionsOutput } from "@/app/api/access/agent-connections/route";
import type { TGetAccessPrincipalsOutput } from "@/app/api/access/principals/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";

export type TAccessPrincipalListItem = NonNullable<TGetAccessPrincipalsOutput["data"]["default"]>[number];
export type TAccessPrincipalById = NonNullable<TGetAccessPrincipalsOutput["data"]["byId"]>;

// Aparelhos do balcão e conexões de IA são listas diferentes na UI, e por isso pedem tipos
// diferentes: sem o filtro, uma conexão do Claude apareceria entre os tablets da loja.
export const DEVICE_PRINCIPAL_TYPES = ["DISPOSITIVO", "AGENTE_DESKTOP"] as const;
export const AGENT_PRINCIPAL_TYPES = ["CONTA_SERVICO"] as const;

async function fetchAccessPrincipals(tipos: readonly string[]) {
	const search = tipos.length > 0 ? `?tipos=${tipos.join(",")}` : "";
	const { data } = await axios.get<TGetAccessPrincipalsOutput>(`/api/access/principals${search}`);
	return data.data.default ?? [];
}

export function useAccessPrincipals({ tipos = DEVICE_PRINCIPAL_TYPES }: { tipos?: readonly string[] } = {}) {
	const queryKey = useMemo(() => ["access-principals", tipos.join(",")] as const, [tipos]);
	return {
		...useQuery({ queryKey, queryFn: () => fetchAccessPrincipals(tipos) }),
		queryKey,
	};
}

async function fetchAgentConnectionOptions() {
	const { data } = await axios.get<TGetAgentConnectionOptionsOutput>("/api/access/agent-connections");
	return data.data;
}

export function useAgentConnectionOptions() {
	const queryKey = ["agent-connection-options"] as const;
	return {
		...useQuery({ queryKey, queryFn: fetchAgentConnectionOptions }),
		queryKey,
	};
}

async function fetchAccessPrincipalById(principalId: string) {
	const { data } = await axios.get<TGetAccessPrincipalsOutput>(`/api/access/principals?id=${principalId}`);
	const principal = data.data.byId;
	if (!principal) throw new Error("Dispositivo não encontrado.");
	return principal;
}

// Memoizada: quem monta um useCallback em cima da queryKey precisa de identidade estável.
export function useAccessPrincipalById({ principalId }: { principalId: string }) {
	const queryKey = useMemo(() => ["access-principal-by-id", principalId] as const, [principalId]);
	return {
		...useQuery({ queryKey, queryFn: () => fetchAccessPrincipalById(principalId) }),
		queryKey,
	};
}
