import type { TGetFiscalDocumentsOutput } from "@/app/api/fiscal/documents/route";
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

async function fetchFiscalDocuments({ page, search, documentId }: { page?: number; search?: string; documentId?: string }) {
	const searchParams = new URLSearchParams();
	if (page) searchParams.set("page", page.toString());
	if (search) searchParams.set("search", search);
	if (documentId) searchParams.set("documentId", documentId);
	const { data } = await axios.get<TGetFiscalDocumentsOutput>(`/api/fiscal/documents?${searchParams.toString()}`);
	return data.data;
}

export function useFiscalDocuments() {
	const [filters, setFilters] = useState({ page: 1, search: "" });
	const debounced = useDebounceMemo({ search: filters.search }, 500);
	const finalFilters = { ...filters, ...debounced };
	const queryKey = ["fiscal-documents", finalFilters];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchFiscalDocuments(finalFilters),
		}),
		queryKey,
		filters,
		updateFilters: (next: Partial<typeof filters>) => setFilters((prev) => ({ ...prev, ...next })),
	};
}

export function useFiscalDocumentById(documentId: string | null) {
	const queryKey = ["fiscal-document-by-id", documentId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchFiscalDocuments({ documentId: documentId ?? undefined }),
			enabled: !!documentId,
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

async function fetchFiscalOperationProfiles() {
	const { data } = await axios.get<TGetFiscalOperationProfilesOutput>("/api/fiscal/operation-profiles");
	return data.data.default;
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
