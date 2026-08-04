import type {
	TCreateIntegrationInput,
	TCreateIntegrationOutput,
	TDeleteIntegrationOutput,
	TUpdateIntegrationInput,
	TUpdateIntegrationOutput,
} from "@/app/api/integrations/route";
import type { TUpdateIntegrationSettingsInput, TUpdateIntegrationSettingsOutput } from "@/app/api/integrations/settings/route";
import axios from "axios";

export async function createIntegration(input: TCreateIntegrationInput) {
	const { data } = await axios.post<TCreateIntegrationOutput>("/api/integrations", input);
	return data;
}

export async function updateIntegration(input: TUpdateIntegrationInput) {
	const { data } = await axios.patch<TUpdateIntegrationOutput>("/api/integrations", input);
	return data;
}

export async function updateIntegrationSettings(input: TUpdateIntegrationSettingsInput) {
	const { data } = await axios.put<TUpdateIntegrationSettingsOutput>("/api/integrations/settings", input);
	return data;
}

export async function deleteIntegration(input: { id: string }) {
	const { data } = await axios.delete<TDeleteIntegrationOutput>(`/api/integrations?id=${input.id}`);
	return data;
}
