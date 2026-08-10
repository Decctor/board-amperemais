import type { TGetCustomFieldsInput, TGetCustomFieldsOutput } from "@/app/api/custom-fields/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchCustomFields(input: Partial<TGetCustomFieldsInput>) {
	const searchParams = new URLSearchParams();
	if (input.entidade) searchParams.set("entidade", input.entidade);
	if (input.ativoOnly) searchParams.set("ativoOnly", "true");
	const { data } = await axios.get<TGetCustomFieldsOutput>(`/api/custom-fields?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Campos personalizados não encontrados.");
	return result;
}

type UseCustomFieldsParams = {
	entidade?: TGetCustomFieldsInput["entidade"];
	ativoOnly?: boolean;
};
export function useCustomFields({ entidade, ativoOnly }: UseCustomFieldsParams = {}) {
	const queryParams = { entidade: entidade ?? null, ativoOnly: ativoOnly ?? false };
	const queryKey = ["custom-fields", queryParams];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchCustomFields(queryParams),
		}),
		queryKey,
		queryParams,
	};
}

async function fetchCustomFieldById(id: string) {
	const { data } = await axios.get<TGetCustomFieldsOutput>(`/api/custom-fields?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Campo personalizado não encontrado.");
	return result;
}

export function useCustomFieldById({ fieldId }: { fieldId: string }) {
	return {
		...useQuery({
			queryKey: ["custom-field-by-id", fieldId],
			queryFn: () => fetchCustomFieldById(fieldId),
		}),
		queryKey: ["custom-field-by-id", fieldId],
	};
}
