import type { TCreateUtilInput, TCreateUtilOutput, TUpdateUtilInput, TUpdateUtilOutput } from "@/app/api/utils/route";
import axios from "axios";
import type { TDataDeletionRequestInput, TCreateDataDeletionRequestOutput } from "@/app/api/data-deletion-requests/route";

export async function createUtil(input: TCreateUtilInput) {
	const result = await axios.post<TCreateUtilOutput>("/api/utils", input);
	return result.data;
}

export async function updateUtil(input: TUpdateUtilInput) {
	const result = await axios.put<TUpdateUtilOutput>(`/api/utils?id=${input.utilId}`, input);
	return result.data;
}

export async function createDataDeletionRequest(input: TDataDeletionRequestInput) {
	const result = await axios.post<TCreateDataDeletionRequestOutput>("/api/data-deletion-requests", input);
	return result.data;
}
