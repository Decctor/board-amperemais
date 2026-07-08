import type { TCreateAudienceOutput, TDeleteAudienceOutput, TUpdateAudienceOutput } from "@/app/api/audiences/route";
import type { TConnectDestinationInput, TConnectDestinationOutput, TDisconnectDestinationOutput } from "@/app/api/audiences/destinations/route";
import type { TSyncDestinationOutput } from "@/app/api/audiences/destinations/sync/route";
import type { TCreateAudienceInput, TUpdateAudienceInput } from "@/schemas/audiences";
import axios from "axios";

export async function createAudience(input: TCreateAudienceInput) {
	const { data } = await axios.post<TCreateAudienceOutput>("/api/audiences", input);
	return data;
}

export async function updateAudience(input: TUpdateAudienceInput) {
	const { data } = await axios.put<TUpdateAudienceOutput>("/api/audiences", input);
	return data;
}

export async function deleteAudience(input: { id: string }) {
	const { data } = await axios.delete<TDeleteAudienceOutput>(`/api/audiences?id=${input.id}`);
	return data;
}

export async function connectAudienceDestination(input: TConnectDestinationInput) {
	const { data } = await axios.post<TConnectDestinationOutput>("/api/audiences/destinations", input);
	return data;
}

export async function disconnectAudienceDestination(input: { id: string }) {
	const { data } = await axios.delete<TDisconnectDestinationOutput>(`/api/audiences/destinations?id=${input.id}`);
	return data;
}

export async function syncAudienceDestination(input: { id: string }) {
	const { data } = await axios.post<TSyncDestinationOutput>("/api/audiences/destinations/sync", input);
	return data;
}
