import type { TGetPoiTransactionRequestStatusOutput } from "@/app/api/point-of-interaction/transaction-requests/public/route";
import type { TGetPoiTransactionRequestsOutput } from "@/app/api/point-of-interaction/transaction-requests/management/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";

const DEFAULT_POI_TRANSACTION_REQUEST_STATUSES = ["PENDENTE", "PROCESSANDO"];

async function fetchPoiTransactionRequestStatus(token: string) {
	const { data } = await axios.get<TGetPoiTransactionRequestStatusOutput>(`/api/point-of-interaction/transaction-requests/public?token=${token}`);
	return data.data;
}

export function usePoiTransactionRequestStatus({ token }: { token: string | null }) {
	const queryKey = ["poi-transaction-request-status", token ?? ""] as const;

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchPoiTransactionRequestStatus(token as string),
			enabled: !!token,
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				return status === "PENDENTE" || status === "PROCESSANDO" ? 3000 : false;
			},
		}),
		queryKey,
	};
}

async function fetchPoiTransactionRequests(statuses: string[]) {
	const searchParams = new URLSearchParams();
	if (statuses.length > 0) searchParams.set("status", statuses.join(","));
	const { data } = await axios.get<TGetPoiTransactionRequestsOutput>(`/api/point-of-interaction/transaction-requests/management?${searchParams.toString()}`);
	return data.data.requests;
}

export function usePoiTransactionRequests({ statuses = DEFAULT_POI_TRANSACTION_REQUEST_STATUSES }: { statuses?: string[] } = {}) {
	const queryKey = useMemo(() => ["poi-transaction-requests", ...statuses], [statuses.join("|")]);

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchPoiTransactionRequests(statuses),
		}),
		queryKey,
	};
}
