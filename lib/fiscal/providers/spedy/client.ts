import type { TFiscalOrganization } from "@/lib/fiscal/types";
import axios, { type AxiosInstance } from "axios";
import createHttpError from "http-errors";

/**
 * Host fixo da Spedy. Nao e configuravel por organizacao de proposito.
 *
 * A URL ja morou no JSON de configuracao fiscal de cada organizacao, e a credencial sempre veio
 * do ambiente (`SPEDY_OWNER_API_KEY`). As duas fontes divergiam sem nenhuma validacao: uma
 * organizacao apontada para `sandbox-api.spedy.com.br` recebia a chave de producao e falhava com
 * 401 "Usuario nao autenticado" — sintoma que parece credencial errada quando o problema e o host.
 *
 * Host e credencial pertencem ao mesmo ambiente; separa-los em escopos diferentes (um por
 * organizacao, outro global) torna a combinacao invalida representavel. Fixar o host elimina a
 * classe inteira de erro. O ambiente de teste da emissao continua sendo o `ambiente`
 * (HOMOLOGACAO/PRODUCAO), que e o da propria SEFAZ.
 */
export const SPEDY_BASE_URL = "https://api.spedy.com.br";

export function createSpedyClient({ apiKey }: { apiKey?: string | null }): AxiosInstance {
	if (!apiKey) throw new createHttpError.BadRequest("Chave de API da Spedy não configurada.");
	return axios.create({
		baseURL: SPEDY_BASE_URL,
		headers: {
			"X-Api-Key": apiKey,
			"Content-Type": "application/json",
		},
	});
}

export function getSpedyOwnerClient() {
	return createSpedyClient({ apiKey: process.env.SPEDY_OWNER_API_KEY });
}

export function getSpedyCompanyClient(organizacao: TFiscalOrganization) {
	return createSpedyClient({ apiKey: organizacao.fiscalConfiguracao?.spedy?.companyApiKey });
}
