import type { TGetClientDuplicatesOutput } from "@/app/api/clients/duplicates/route";
import type { TGetClientDuplicateComparisonOutput } from "@/app/api/clients/duplicates/comparison/route";
import type { TClientDuplicateSignalTypeEnum } from "@/schemas/enums";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";

export type TClientDuplicateEntityType = "client" | "sale";

async function fetchClientDuplicatesForEntity({ entityType, entityId }: { entityType: TClientDuplicateEntityType; entityId: string }) {
	const searchParams = new URLSearchParams();
	searchParams.set("entityType", entityType);
	searchParams.set("entityId", entityId);
	const { data } = await axios.get<TGetClientDuplicatesOutput>(`/api/clients/duplicates?${searchParams.toString()}`);
	if (!data.data.byEntity) throw new Error("Duplicidades não encontradas.");
	return data.data.byEntity;
}

export function useClientDuplicatesForEntity({ entityType, entityId }: { entityType: TClientDuplicateEntityType; entityId: string }) {
	return {
		...useQuery({
			queryKey: ["client-duplicates-by-entity", entityType, entityId],
			queryFn: () => fetchClientDuplicatesForEntity({ entityType, entityId }),
			staleTime: 30_000,
		}),
		queryKey: ["client-duplicates-by-entity", entityType, entityId],
	};
}

async function fetchClientDuplicatesList({
	cursor,
	limit,
	signalType,
}: {
	cursor: { dataInsercao: string; id: string } | null;
	limit?: number;
	signalType?: TClientDuplicateSignalTypeEnum | null;
}) {
	const searchParams = new URLSearchParams();
	searchParams.set("status", "PENDENTE");
	if (signalType) searchParams.set("signalType", signalType);
	if (cursor) {
		searchParams.set("cursorDataInsercao", cursor.dataInsercao);
		searchParams.set("cursorId", cursor.id);
	}
	if (limit) searchParams.set("limit", limit.toString());
	const { data } = await axios.get<TGetClientDuplicatesOutput>(`/api/clients/duplicates?${searchParams.toString()}`);
	if (!data.data.default) throw new Error("Duplicidades não encontradas.");
	return data.data.default;
}

export function usePendingClientDuplicates({
	enabled = true,
	signalType = null,
}: { enabled?: boolean; signalType?: TClientDuplicateSignalTypeEnum | null } = {}) {
	const queryKey = ["client-duplicates-pending", signalType];
	return {
		...useInfiniteQuery({
			queryKey,
			queryFn: ({ pageParam }) => fetchClientDuplicatesList({ cursor: pageParam, signalType }),
			initialPageParam: null as { dataInsercao: string; id: string } | null,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			enabled,
			refetchOnWindowFocus: false,
			// Ao trocar o filtro, mantém a lista anterior visível enquanto a nova chega.
			placeholderData: keepPreviousData,
		}),
		queryKey,
	};
}

export function usePendingClientDuplicatesCount() {
	return {
		...useQuery({
			queryKey: ["client-duplicates-pending-count"],
			queryFn: () => fetchClientDuplicatesList({ cursor: null, limit: 100 }),
			staleTime: 60_000,
		}),
		queryKey: ["client-duplicates-pending-count"],
	};
}

async function fetchClientDuplicateComparison(pairId: string) {
	const searchParams = new URLSearchParams();
	searchParams.set("pairId", pairId);
	const { data } = await axios.get<TGetClientDuplicateComparisonOutput>(`/api/clients/duplicates/comparison?${searchParams.toString()}`);
	return data.data;
}

export function useClientDuplicateComparison({ pairId }: { pairId: string }) {
	return {
		...useQuery({
			queryKey: ["client-duplicate-comparison", pairId],
			queryFn: () => fetchClientDuplicateComparison(pairId),
			enabled: !!pairId,
		}),
		queryKey: ["client-duplicate-comparison", pairId],
	};
}
