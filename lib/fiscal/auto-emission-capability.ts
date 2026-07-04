import type { TOrganizationFiscalConfig } from "@/schemas/fiscal";

/**
 * Verifica se a organização está minimamente configurada para emissão fiscal automática (NFC-e).
 *
 * Espelha a parte síncrona das guardas de `updateFiscalSettings`: provedor Nuvem Fiscal + CSC/ID CSC
 * da NFC-e + certificado digital. NÃO valida perfil de operação nem série ativa (exigem consulta ao
 * banco) — esses casos, se faltarem, são tratados como falha de emissão pelo worker. Serve para gatear
 * a UI (exibir/ocultar o controle por venda) e evitar enfileirar documentos que a org não pode emitir.
 */
export function isOrganizationAutoFiscalCapable(organization: {
	fiscalProvedor: "MANUAL" | "NUVEM_FISCAL" | null | undefined;
	fiscalConfiguracao: TOrganizationFiscalConfig | null | undefined;
}): boolean {
	if (organization.fiscalProvedor !== "NUVEM_FISCAL") return false;

	const config = organization.fiscalConfiguracao;
	if (!config?.nuvemFiscal?.nfce?.csc || !config.nuvemFiscal.nfce.idCsc) return false;
	if (!config.nuvemFiscal?.certificado?.storagePath) return false;

	return true;
}
