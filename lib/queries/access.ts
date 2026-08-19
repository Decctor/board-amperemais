import type { TGetAccessPrincipalsOutput } from "@/app/api/access/principals/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";

export type TAccessPrincipalListItem = NonNullable<TGetAccessPrincipalsOutput["data"]["default"]>[number];
export type TAccessPrincipalById = NonNullable<TGetAccessPrincipalsOutput["data"]["byId"]>;

async function fetchAccessPrincipals() {
	const { data } = await axios.get<TGetAccessPrincipalsOutput>("/api/access/principals");
	return data.data.default ?? [];
}

export function useAccessPrincipals() {
	const queryKey = ["access-principals"] as const;
	return {
		...useQuery({ queryKey, queryFn: fetchAccessPrincipals }),
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
