import type { TFiscalDocumentEnvironmentEnum } from "@/schemas/enums";
import axios, { type AxiosInstance } from "axios";
import createHttpError from "http-errors";

const PRODUCTION_BASE_URL = "https://api.nuvemfiscal.com.br";
const SANDBOX_BASE_URL = "https://api.sandbox.nuvemfiscal.com.br";

// A baseURL e dirigida pelo ambiente fiscal da organizacao. O access token OAuth e global
// da aplicacao (util NUVEM_FISCAL_API_TOKEN) — ver getNuvemFiscalAccessToken().
export function createNuvemFiscalClient({
	apiToken,
	ambiente,
}: {
	apiToken?: string | null;
	ambiente?: TFiscalDocumentEnvironmentEnum | null;
}): AxiosInstance {
	if (!apiToken) {
		throw new createHttpError.BadRequest("Token da Nuvem Fiscal nao configurado para esta organizacao. Configure o token nas configuracoes fiscais.");
	}

	return axios.create({
		baseURL: ambiente === "PRODUCAO" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
	});
}
