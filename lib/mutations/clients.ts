import type {
	TCreateClientViaPointOfInteractionInput,
	TCreateClientViaPointOfInteractionOutput,
} from "@/app/api/point-of-interaction/new-client/route";
import type { TCreateClientInput, TCreateClientOutput, TUpdateClientInput, TUpdateClientOutput } from "@/app/api/clients/route";
import type { TBulkCreateClientsInput, TBulkCreateClientsOutput } from "@/app/api/clients/bulk/route";
import type { TCreateClientTagInput, TCreateClientTagOutput, TUpdateClientTagInput, TUpdateClientTagOutput } from "@/app/api/clients/tags/route";
import type { TBulkClientsMapInput, TBulkClientsMapOutput } from "@/state-hooks/use-bulk-create-clients";
import axios from "axios";

export async function createClient(info: TCreateClientInput) {
	const { data } = await axios.post<TCreateClientOutput>("/api/clients", info);
	return data;
}
export async function updateClient(info: TUpdateClientInput) {
	const { data } = await axios.put<TUpdateClientOutput>("/api/clients", info);
	return data;
}
export async function bulkCreateClients(info: TBulkCreateClientsInput, onUploadProgress?: (progress: number) => void) {
	const { data } = await axios.post<TBulkCreateClientsOutput>("/api/clients/bulk", info, {
		onUploadProgress: (progressEvent) => onUploadProgress?.(Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1))),
	});
	return data;
}

export async function suggestClientsSheetMapping(input: TBulkClientsMapInput) {
	const { data } = await axios.post<{
		data: TBulkClientsMapOutput;
		message: string;
	}>("/api/clients/bulk/map", input);
	return data;
}

export async function createClientViaPointOfInteraction(info: TCreateClientViaPointOfInteractionInput) {
	const { data } = await axios.post<TCreateClientViaPointOfInteractionOutput>("/api/point-of-interaction/new-client", info);
	return data;
}

export async function createClientTag(info: TCreateClientTagInput) {
	const { data } = await axios.post<TCreateClientTagOutput>("/api/clients/tags", info);
	return data;
}

export async function updateClientTag(info: TUpdateClientTagInput) {
	const { data } = await axios.put<TUpdateClientTagOutput>("/api/clients/tags", info);
	return data;
}
