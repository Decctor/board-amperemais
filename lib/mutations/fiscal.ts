import type { TSyncFiscalCompanyOutput } from "@/app/api/fiscal/company/sync/route";
import type { TSyncFiscalCertificateInput, TSyncFiscalCertificateOutput } from "@/app/api/fiscal/company/sync-certificate/route";
import type { TCancelFiscalDocumentInput, TCancelFiscalDocumentOutput } from "@/app/api/fiscal/documents/cancel/route";
import type { TCorrectFiscalDocumentInput, TCorrectFiscalDocumentOutput } from "@/app/api/fiscal/documents/correction/route";
import type { TInutilizeFiscalDocumentInput, TInutilizeFiscalDocumentOutput } from "@/app/api/fiscal/documents/inutilize/route";
import type { TManifestInboundInput, TManifestInboundOutput } from "@/app/api/fiscal/inbound/manifest/route";
import type { TReturnFiscalDocumentInput, TReturnFiscalDocumentOutput } from "@/app/api/fiscal/documents/return/route";
import type { TCreateFiscalDocumentOutput, TEmitFiscalDocumentInput } from "@/app/api/fiscal/documents/route";
import type { TSyncFiscalDocumentInput, TSyncFiscalDocumentOutput } from "@/app/api/fiscal/documents/sync/route";
import type {
	TCreateFiscalOperationProfileInput,
	TCreateFiscalOperationProfileOutput,
	TUpdateFiscalOperationProfileInput,
	TUpdateFiscalOperationProfileOutput,
} from "@/app/api/fiscal/operation-profiles/route";
import type {
	TCreateFiscalSeriesInput,
	TCreateFiscalSeriesOutput,
	TUpdateFiscalSeriesInput,
	TUpdateFiscalSeriesOutput,
} from "@/app/api/fiscal/series/route";
import type { TUpdateFiscalSettingsInput, TUpdateFiscalSettingsOutput } from "@/app/api/fiscal/settings/route";
import type {
	TCreateFiscalTaxGroupInput,
	TCreateFiscalTaxGroupOutput,
	TUpdateFiscalTaxGroupInput,
	TUpdateFiscalTaxGroupOutput,
} from "@/app/api/fiscal/tax-groups/route";
import axios from "axios";

export async function updateFiscalSettings(input: TUpdateFiscalSettingsInput) {
	const { data } = await axios.put<TUpdateFiscalSettingsOutput>("/api/fiscal/settings", input);
	return data;
}

export async function syncFiscalCompany() {
	const { data } = await axios.post<TSyncFiscalCompanyOutput>("/api/fiscal/company/sync");
	return data;
}

export async function syncFiscalCompanyCertificate(input: TSyncFiscalCertificateInput) {
	const formData = new FormData();
	formData.append("file", input.file);
	formData.append("password", input.password);
	const { data } = await axios.post<TSyncFiscalCertificateOutput>("/api/fiscal/company/sync-certificate", formData);
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

export async function correctFiscalDocumentMutation(input: TCorrectFiscalDocumentInput) {
	const { data } = await axios.post<TCorrectFiscalDocumentOutput>("/api/fiscal/documents/correction", input);
	return data;
}

export async function inutilizeFiscalDocumentMutation(input: TInutilizeFiscalDocumentInput) {
	const { data } = await axios.post<TInutilizeFiscalDocumentOutput>("/api/fiscal/documents/inutilize", input);
	return data;
}

export async function returnFiscalDocumentMutation(input: TReturnFiscalDocumentInput) {
	const { data } = await axios.post<TReturnFiscalDocumentOutput>("/api/fiscal/documents/return", input);
	return data;
}

export async function manifestInboundDocumentMutation(input: TManifestInboundInput) {
	const { data } = await axios.post<TManifestInboundOutput>("/api/fiscal/inbound/manifest", input);
	return data;
}

export async function createFiscalSeriesMutation(input: TCreateFiscalSeriesInput) {
	const { data } = await axios.post<TCreateFiscalSeriesOutput>("/api/fiscal/series", input);
	return data;
}

export async function updateFiscalSeriesMutation(input: TUpdateFiscalSeriesInput) {
	const { data } = await axios.put<TUpdateFiscalSeriesOutput>("/api/fiscal/series", input);
	return data;
}

export async function createFiscalOperationProfileMutation(input: TCreateFiscalOperationProfileInput) {
	const { data } = await axios.post<TCreateFiscalOperationProfileOutput>("/api/fiscal/operation-profiles", input);
	return data;
}
export async function updateFiscalOperationProfileMutation(input: TUpdateFiscalOperationProfileInput) {
	const { data } = await axios.put<TUpdateFiscalOperationProfileOutput>("/api/fiscal/operation-profiles", input);
	return data;
}

export async function createFiscalTaxGroupMutation(input: TCreateFiscalTaxGroupInput) {
	const { data } = await axios.post<TCreateFiscalTaxGroupOutput>("/api/fiscal/tax-groups", input);
	return data;
}
export async function updateFiscalTaxGroupMutation(input: TUpdateFiscalTaxGroupInput) {
	const { data } = await axios.put<TUpdateFiscalTaxGroupOutput>("/api/fiscal/tax-groups", input);
	return data;
}
