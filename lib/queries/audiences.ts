import type { TGetAudiencesOutput } from "@/app/api/audiences/route";
import type { TPreviewAudienceInput, TPreviewAudienceOutput } from "@/app/api/audiences/preview/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchAudiences() {
	const { data } = await axios.get<TGetAudiencesOutput>("/api/audiences");
	return data.data.default ?? [];
}

export function useAudiences() {
	const queryKey = ["audiences"];
	return {
		...useQuery({ queryKey, queryFn: fetchAudiences }),
		queryKey,
	};
}

/** Prévia (contagem) de um público a partir de filtros ainda não salvos. */
export async function previewAudience(input: TPreviewAudienceInput) {
	const { data } = await axios.post<TPreviewAudienceOutput>("/api/audiences/preview", input);
	return data.data;
}
