import type { TGetWhatsappTemplatesInput, TGetWhatsappTemplatesOutput } from "@/app/api/whatsapp-templates/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";
import type { TGetWhatsappTemplatePhoneOutput } from "@/app/api/whatsapp-templates/phones/route";

async function getWhatsappTemplates(input: Omit<TGetWhatsappTemplatesInput, "id">) {
	const searchParams = new URLSearchParams();
	if (input.search && input.search.trim().length > 0) searchParams.set("search", input.search);
	if (input.whatsappConnectionPhoneId) searchParams.set("whatsappConnectionPhoneId", input.whatsappConnectionPhoneId);
	if (input.includeRecompraTemplates) searchParams.set("includeRecompraTemplates", "true");
	searchParams.set("page", input.page?.toString() ?? "1");
	const url = `/api/whatsapp-templates?${searchParams.toString()}`;
	const { data } = await axios.get<TGetWhatsappTemplatesOutput>(url);
	const result = data.data.default;
	if (!result) throw new Error("Templates não encontrados.");
	return result;
}

async function getWhatsappTemplateById(id: string) {
	const { data } = await axios.get<TGetWhatsappTemplatesOutput>(`/api/whatsapp-templates?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Template não encontrado.");
	return result;
}

type UseWhatsappTemplatesParams = {
	initialParams?: Partial<Omit<TGetWhatsappTemplatesInput, "id">>;
};
export function useWhatsappTemplates({ initialParams }: UseWhatsappTemplatesParams) {
	const [params, setParams] = useState<Omit<TGetWhatsappTemplatesInput, "id">>({
		page: initialParams?.page || 1,
		search: initialParams?.search || "",
		whatsappConnectionPhoneId: initialParams?.whatsappConnectionPhoneId || undefined,
		includeRecompraTemplates: initialParams?.includeRecompraTemplates || false,
	});
	const updateParams = useCallback((newParams: Partial<Omit<TGetWhatsappTemplatesInput, "id">>) => {
		setParams((prevParams) => ({ ...prevParams, ...newParams }));
	}, []);
	const debouncedParams = useDebounceMemo(params, 500);
	return {
		...useQuery({
			queryKey: ["whatsapp-templates", debouncedParams],
			queryFn: async () => await getWhatsappTemplates(debouncedParams),
		}),
		queryKey: ["whatsapp-templates", debouncedParams],
		params,
		updateParams,
	};
}

export function useWhatsappTemplateById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["whatsapp-template-by-id", id],
			queryFn: async () => await getWhatsappTemplateById(id),
		}),
		queryKey: ["whatsapp-template-by-id", id],
	};
}

async function getWhatsappTemplatePhoneById(id: string) {
	const { data } = await axios.get<TGetWhatsappTemplatePhoneOutput>(`/api/whatsapp-templates/phones?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Telefone do template não encontrado.");
	return result;
}

export function useWhatsappTemplatePhoneById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["whatsapp-template-phone-by-id", id],
			queryFn: async () => await getWhatsappTemplatePhoneById(id),
		}),
		queryKey: ["whatsapp-template-phone-by-id", id],
	};
}
