import type {
	TCreateCustomFieldInput,
	TCreateCustomFieldOutput,
	TDeleteCustomFieldOutput,
	TUpdateCustomFieldInput,
	TUpdateCustomFieldOutput,
} from "@/app/api/custom-fields/route";
import axios from "axios";

export async function createCustomField(input: TCreateCustomFieldInput) {
	const { data } = await axios.post<TCreateCustomFieldOutput>("/api/custom-fields", input);
	return data;
}

export async function updateCustomField(input: TUpdateCustomFieldInput) {
	const { data } = await axios.put<TUpdateCustomFieldOutput>("/api/custom-fields", input);
	return data;
}

/** Desativação (soft delete) — a definição sobrevive porque as respostas a referenciam. */
export async function deleteCustomField(input: { id: string }) {
	const { data } = await axios.delete<TDeleteCustomFieldOutput>(`/api/custom-fields?id=${input.id}`);
	return data;
}
