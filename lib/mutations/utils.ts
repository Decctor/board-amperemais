import type { TCreateUtilInput, TCreateUtilOutput, TUpdateUtilInput, TUpdateUtilOutput } from "@/app/api/utils/route";
import axios from "axios";

export async function createUtil(input: TCreateUtilInput) {
	const result = await axios.post<TCreateUtilOutput>("/api/utils", input);
	return result.data;
}

export async function updateUtil(input: TUpdateUtilInput) {
	const result = await axios.put<TUpdateUtilOutput>(`/api/utils?id=${input.utilId}`, input);
	return result.data;
}
