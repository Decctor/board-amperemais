import axios from "axios";
import type { TApproveHintOutput } from "@/app/api/ai-hints/approve/route";
import type { TDismissHintInput, TDismissHintOutput } from "@/app/api/ai-hints/dismiss/route";
import type { TApproveHintInput } from "@/schemas/ai-hints";
import type { TGenerateHintsOutput } from "@/app/api/ai-hints/generate/route";

export async function approveHint(input: TApproveHintInput) {
	const { data } = await axios.post<TApproveHintOutput>(`/api/ai-hints/approve?id=${input.id}`);
	return data;
}

export async function dismissHint(input: TDismissHintInput) {
	const { data } = await axios.post<TDismissHintOutput>(`/api/ai-hints/dismiss?id=${input.id}`);
	return data;
}

export async function generateHints() {
	const { data } = await axios.post<TGenerateHintsOutput>(`/api/ai-hints/generate`);
	return data;
}
