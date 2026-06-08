import axios from "axios";
import type { TClaimCommunityMaterialInput, TClaimCommunityMaterialOutput } from "@/app/api/community/materials/claim/route";

export async function updateProgress(input: { aulaId: string; concluido: boolean; progressoSegundos: number }) {
	const { data } = await axios.post("/api/community/progress", input);
	return data;
}

export async function claimCommunityMaterial(input: TClaimCommunityMaterialInput) {
	const { data } = await axios.post<TClaimCommunityMaterialOutput>("/api/community/materials/claim", input);
	return data;
}
