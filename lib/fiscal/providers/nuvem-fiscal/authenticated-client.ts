import type { TFiscalOrganization } from "@/lib/fiscal/types";
import { getNuvemFiscalAccessToken } from "./access-token";
import { createNuvemFiscalClient } from "./client";

export async function getNuvemFiscalAuthenticatedClient(organizacao: TFiscalOrganization) {
	const apiToken = await getNuvemFiscalAccessToken();
	return createNuvemFiscalClient({
		ambiente: organizacao.fiscalConfiguracao?.ambiente,
		apiToken,
	});
}
