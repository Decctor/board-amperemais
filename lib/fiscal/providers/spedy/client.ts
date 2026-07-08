import type { TFiscalOrganization } from "@/lib/fiscal/types";
import axios, { type AxiosInstance } from "axios";
import createHttpError from "http-errors";

const DEFAULT_SPEDY_BASE_URL = "https://api.spedy.com.br";

function normalizeBaseUrl(value: string | null | undefined) {
	return value?.trim() || process.env.SPEDY_BASE_URL || DEFAULT_SPEDY_BASE_URL;
}

export function createSpedyClient({ apiKey, baseUrl }: { apiKey?: string | null; baseUrl?: string | null }): AxiosInstance {
	if (!apiKey) throw new createHttpError.BadRequest("Chave de API da Spedy não configurada.");
	return axios.create({
		baseURL: normalizeBaseUrl(baseUrl),
		headers: {
			"X-Api-Key": apiKey,
			"Content-Type": "application/json",
		},
	});
}

export function getSpedyOwnerClient(organizacao?: TFiscalOrganization) {
	return createSpedyClient({
		apiKey: process.env.SPEDY_OWNER_API_KEY,
		baseUrl: organizacao?.fiscalConfiguracao?.spedy?.api?.baseUrl,
	});
}

export function getSpedyCompanyClient(organizacao: TFiscalOrganization) {
	const config = organizacao.fiscalConfiguracao?.spedy;
	return createSpedyClient({
		apiKey: config?.companyApiKey,
		baseUrl: config?.api?.baseUrl,
	});
}
