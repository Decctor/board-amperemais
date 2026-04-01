import type { TSyncFiscalCompanyOutput } from "@/app/api/fiscal/company/sync/route";
import type { TCancelFiscalDocumentInput, TCancelFiscalDocumentOutput } from "@/app/api/fiscal/documents/cancel/route";
import type { TCreateFiscalDocumentOutput, TEmitFiscalDocumentInput } from "@/app/api/fiscal/documents/route";
import type { TSyncFiscalDocumentInput, TSyncFiscalDocumentOutput } from "@/app/api/fiscal/documents/sync/route";
import type { TUpsertFiscalOperationProfileInput, TUpsertFiscalOperationProfileOutput } from "@/app/api/fiscal/operation-profiles/route";
import type { TUpsertFiscalSeriesInput, TUpsertFiscalSeriesOutput } from "@/app/api/fiscal/series/route";
import type { TUpdateFiscalSettingsInput, TUpdateFiscalSettingsOutput } from "@/app/api/fiscal/settings/route";
import axios from "axios";

export async function updateFiscalSettings(input: TUpdateFiscalSettingsInput) {
	const { data } = await axios.put<TUpdateFiscalSettingsOutput>("/api/fiscal/settings", input);
	return data;
}

export async function syncFiscalCompany() {
	const { data } = await axios.post<TSyncFiscalCompanyOutput>("/api/fiscal/company/sync");
	return data;
}

export async function emitFiscalDocumentMutation(input: TEmitFiscalDocumentInput) {
	const { data } = await axios.post<TCreateFiscalDocumentOutput>("/api/fiscal/documents", input);
	return data;
}

export async function syncFiscalDocumentMutation(input: TSyncFiscalDocumentInput) {
	const { data } = await axios.post<TSyncFiscalDocumentOutput>("/api/fiscal/documents/sync", input);
	return data;
}

export async function cancelFiscalDocumentMutation(input: TCancelFiscalDocumentInput) {
	const { data } = await axios.post<TCancelFiscalDocumentOutput>("/api/fiscal/documents/cancel", input);
	return data;
}

export async function upsertFiscalSeriesMutation(input: TUpsertFiscalSeriesInput) {
	const { data } = await axios.put<TUpsertFiscalSeriesOutput>("/api/fiscal/series", input);
	return data;
}

export async function upsertFiscalOperationProfileMutation(input: TUpsertFiscalOperationProfileInput) {
	const { data } = await axios.put<TUpsertFiscalOperationProfileOutput>("/api/fiscal/operation-profiles", input);
	return data;
}
