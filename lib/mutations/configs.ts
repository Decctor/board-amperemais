import type { TCreateRFMConfigInput, TCreateRFMConfigOutput, TUpdateRFMConfigInput, TUpdateRFMConfigOutput } from "@/pages/api/settings/rfm";
import axios from "axios";

export async function updateRFMConfig(info: TUpdateRFMConfigInput) {
	const { data } = await axios.put<TUpdateRFMConfigOutput>("/api/settings/rfm", info);
	return data;
}

export async function createRFMConfig(info: TCreateRFMConfigInput) {
	const { data } = await axios.post<TCreateRFMConfigOutput>("/api/settings/rfm", info);
	return data;
}
