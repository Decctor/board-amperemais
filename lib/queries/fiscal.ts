import type { TGetFiscalDocumentsInput, TGetFiscalDocumentsOutput } from "@/app/api/fiscal/documents/route";
import type { TGetFiscalOperationProfilesOutput } from "@/app/api/fiscal/operation-profiles/route";
import type { TGetFiscalSeriesOutput } from "@/app/api/fiscal/series/route";
import type { TGetFiscalSettingsOutput } from "@/app/api/fiscal/settings/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchFiscalSettings() {
	const { data } = await axios.get<TGetFiscalSettingsOutput>("/api/fiscal/settings");
	return data.data;
}

export function useFiscalSettings() {
	const queryKey = ["fiscal-settings"];
	return {
		...useQuery({
			queryKey,
			queryFn: fetchFiscalSettings,
		}),
		queryKey,
	};
}

async function fetchFiscalDocuments({ page, search }: Omit<TGetFiscalDocumentsInput, "documentId">) {
	const searchParams = new URLSearchParams();
	if (page) searchParams.set("page", page.toString());
	if (search) searchParams.set("search", search);
	const { data } = await axios.get<TGetFiscalDocumentsOutput>(`/api/fiscal/documents?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Oops, houve um erro ao buscar os documentos fiscais.");
	return result;
}
async function fetchFiscalDocumentById({ documentId }: { documentId: string }) {
	const searchParams = new URLSearchParams();
	searchParams.set("documentId", documentId);
	const { data } = await axios.get<TGetFiscalDocumentsOutput>(`/api/fiscal/documents?${searchParams.toString()}`);
	const result = data.data.byId;
	if (!result) throw new Error("Oops, houve um erro ao buscar o documento fiscal.");
	return result;
}

export function useFiscalDocuments() {
	const [filters, setFilters] = useState<Exclude<TGetFiscalDocumentsInput, "documentId">>({ page: 1, search: "" });
	function updateFilters(next: Partial<Exclude<TGetFiscalDocumentsInput, "documentId">>) {
		setFilters((prev) => ({ ...prev, ...next }));
	}

	const debounced = useDebounceMemo({ search: filters.search }, 500);
	const finalFilters = { ...filters, ...debounced };
	const queryKey = ["fiscal-documents", finalFilters];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchFiscalDocuments({ ...finalFilters }),
		}),
		queryKey,
		filters,
		updateFilters,
	};
}

export function useFiscalDocumentById(documentId: string) {
	const queryKey = ["fiscal-document-by-id", documentId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchFiscalDocumentById({ documentId: documentId }),
		}),
		queryKey,
	};
}

async function fetchFiscalSeries() {
	const { data } = await axios.get<TGetFiscalSeriesOutput>("/api/fiscal/series");
	return data.data.default;
}

export function useFiscalSeries() {
	const queryKey = ["fiscal-series"];
	return {
		...useQuery({
			queryKey,
			queryFn: fetchFiscalSeries,
		}),
		queryKey,
	};
}

async function fetchFiscalOperationProfileById({ id }: { id: string }) {
	const { data } = await axios.get<TGetFiscalOperationProfilesOutput>(`/api/fiscal/operation-profiles?id=${id}`);
	return data.data.byId;
}
export function useFiscalOperationProfileById({ id }: { id: string }) {
	const queryKey = ["fiscal-operation-profile-by-id", id];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchFiscalOperationProfileById({ id }),
		}),
		queryKey,
	};
}
async function fetchFiscalOperationProfiles() {
	const { data } = await axios.get<TGetFiscalOperationProfilesOutput>("/api/fiscal/operation-profiles");
	const defaultData = data.data.default;
	if (!defaultData) throw new Error("Oops, houve um erro ao buscar os perfis de operação fiscal.");
	return defaultData;
}

export function useFiscalOperationProfiles() {
	const queryKey = ["fiscal-operation-profiles"];
	return {
		...useQuery({
			queryKey,
			queryFn: fetchFiscalOperationProfiles,
		}),
		queryKey,
	};
}
