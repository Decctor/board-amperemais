import axios, { type AxiosInstance } from "axios";
import createHttpError from "http-errors";

function getToken(inputToken?: string | null) {
	return inputToken ?? process.env.NUVEM_FISCAL_API_TOKEN ?? null;
}

export function createNuvemFiscalClient({ baseUrl, apiToken }: { baseUrl?: string | null; apiToken?: string | null }): AxiosInstance {
	const token = getToken(apiToken);
	if (!token) throw new createHttpError.InternalServerError("Token da Nuvem Fiscal nao configurado.");

	return axios.create({
		// baseURL: baseUrl ?? process.env.NUVEM_FISCAL_BASE_URL ?? "https://api.nuvemfiscal.com.br",
		baseURL: baseUrl ?? process.env.NUVEM_FISCAL_BASE_URL ?? "https://api.sandbox.nuvemfiscal.com.br",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});
}
