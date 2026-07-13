import type {
	TCreateInteractionInput,
	TCreateInteractionOutput,
	TResolveInteractionInput,
	TResolveInteractionOutput,
} from "@/app/api/interactions/route";
import type { TUpdateCommunicationPauseInput, TUpdateCommunicationPauseOutput } from "@/app/api/clients/communication-pause/route";
import axios from "axios";

export async function createInteraction(input: TCreateInteractionInput) {
	const { data } = await axios.post<TCreateInteractionOutput>("/api/interactions", input);
	return data;
}

export async function resolveInteraction(input: TResolveInteractionInput) {
	const { data } = await axios.patch<TResolveInteractionOutput>("/api/interactions", input);
	return data;
}

export async function updateCommunicationPause(input: TUpdateCommunicationPauseInput) {
	const { data } = await axios.patch<TUpdateCommunicationPauseOutput>("/api/clients/communication-pause", input);
	return data;
}
