import type { TGetMessageTemplatesOutput } from "@/app/api/message-templates/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

// ─── Fetch functions ──────────────────────────────────────────────────────────

async function fetchMessageTemplates(params: { page: number; search?: string }) {
	const searchParams = new URLSearchParams();
	if (params.search && params.search.trim().length > 0) searchParams.set("search", params.search);
	searchParams.set("page", params.page.toString());
	const { data } = await axios.get<TGetMessageTemplatesOutput>(`/api/message-templates?${searchParams.toString()}`);
	const result = data.data.default;
	if (result === null) throw new Error("Grupos de templates não encontrados.");
	return result;
}

async function fetchMessageTemplateById(id: string) {
	const { data } = await axios.get<TGetMessageTemplatesOutput>(`/api/message-templates?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Grupo de templates não encontrado.");
	return result;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

type UseMessageTemplatesParams = {
	initialParams?: { page?: number; search?: string };
};

export function useMessageTemplates({ initialParams }: UseMessageTemplatesParams = {}) {
	const [params, setParams] = useState({ page: initialParams?.page ?? 1, search: initialParams?.search ?? "" });

	const updateParams = useCallback((newParams: Partial<typeof params>) => {
		setParams((prev) => ({ ...prev, ...newParams }));
	}, []);

	const debouncedParams = useDebounceMemo(params, 500);

	return {
		...useQuery({
			queryKey: ["message-templates", debouncedParams],
			queryFn: () => fetchMessageTemplates(debouncedParams),
		}),
		queryKey: ["message-templates", debouncedParams] as const,
		params,
		updateParams,
	};
}

export function useMessageTemplateById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["message-template-by-id", id],
			queryFn: () => fetchMessageTemplateById(id),
		}),
		queryKey: ["message-template-by-id", id] as const,
	};
}
