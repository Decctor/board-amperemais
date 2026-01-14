import type {
	TCreateClientViaPointOfInteractionInput,
	TCreateClientViaPointOfInteractionOutput,
} from "@/app/api/point-of-interaction/new-client/route";
import type { TClient } from "@/schemas/clients";
import axios from "axios";

export async function createClient(info: TClient) {
	const { data } = await axios.post("/api/clients", info);
	if (typeof data.message !== "string") return "Cliente criado com sucesso !";
	return data.message as string;
}

export async function createClientViaPointOfInteraction(info: TCreateClientViaPointOfInteractionInput) {
	const { data } = await axios.post<TCreateClientViaPointOfInteractionOutput>("/api/point-of-interaction/new-client", info);
	return data;
}
