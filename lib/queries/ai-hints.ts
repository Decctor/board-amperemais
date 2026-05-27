import type { TCheckAvailableAiHintsUsageOutput } from "@/app/api/ai-hints/check-avaliable-usage/route";
import type { TGetHintsInput, TGetHintsOutput } from "@/app/api/ai-hints/route";
import type { TAIHintFeedbackType } from "@/schemas/ai-hints";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// FETCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function fetchHints(input: Exclude<TGetHintsInput, "id">) {
	const searchParams = new URLSearchParams();
	if (input.subject) searchParams.set("subject", input.subject);
	if (input.status) searchParams.set("status", input.status);
	if (input.limit) searchParams.set("limit", input.limit.toString());

	const { data } = await axios.get<TGetHintsOutput>(`/api/ai-hints?${searchParams.toString()}`);
	const defaultHints = data.data.default;
	if (!defaultHints) throw new Error("Oops, houve um erro ao buscar as dicas.");
	return defaultHints;
}
async function fetchHintById(input: Pick<TGetHintsInput, "id">) {
	const { data } = await axios.get<TGetHintsOutput>(`/api/ai-hints?id=${input.id}`);
	const hint = data.data.byId;
	if (!hint) throw new Error("Dica não encontrada.");
	return hint;
}

type UseHintsParams = {
	initialParams?: Partial<Exclude<TGetHintsInput, "id">>;
};
export function useAIHints({ initialParams }: UseHintsParams = {}) {
	const [params, setParams] = useState<Exclude<TGetHintsInput, "id">>({
		subject: initialParams?.subject || undefined,
		status: initialParams?.status || "active",
		limit: initialParams?.limit || 5,
	});
	function updateParams(newParams: Partial<Exclude<TGetHintsInput, "id">>) {
		setParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["ai-hints", params],
			queryFn: () => fetchHints(params),
		}),
		queryKey: ["ai-hints", params],
		params,
		updateParams,
	};
}
export function useAIHintById({ id }: Pick<TGetHintsInput, "id">) {
	return {
		...useQuery({
			queryKey: ["ai-hint-by-id", id],
			queryFn: () => fetchHintById({ id }),
		}),
		queryKey: ["ai-hint-by-id", id],
	};
}

async function checkAiHintsUsage() {
	const { data } = await axios.get<TCheckAvailableAiHintsUsageOutput>("/api/ai-hints/check-avaliable-usage");
	return data.data;
}

export function useCheckAiHintsUsage() {
	return {
		...useQuery({
			queryKey: ["ai-hints-usage"],
			queryFn: checkAiHintsUsage,
		}),
		queryKey: ["ai-hints-usage"],
	};
}

async function dismissHint(hintId: string) {
	const { data } = await axios.post(`/api/ai-hints/dismiss?id=${hintId}`);
	return data;
}

async function submitFeedback(params: { hintId: string; tipo: TAIHintFeedbackType; comentario?: string }) {
	const { data } = await axios.post(`/api/ai-hints/feedback?id=${params.hintId}`, {
		tipo: params.tipo,
		comentario: params.comentario,
	});
	return data;
}

export function useDismissHint() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: dismissHint,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ai-hints"] });
		},
	});
}

export function useHintFeedback() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: submitFeedback,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ai-hints"] });
		},
	});
}

// ═══════════════════════════════════════════════════════════════
// ALL HINTS HOOK (for the bubble)
// ═══════════════════════════════════════════════════════════════

export function useAllActiveHints() {
	return useQuery({
		queryKey: ["ai-hints", undefined],
		queryFn: () => fetchHints({ status: "active", limit: 10 }),
		staleTime: 5 * 60 * 1000,
	});
}
