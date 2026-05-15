import { fetchCardapioWebImportBatch } from "./cardapio-web/canonical";
import { fetchNuvemshopImportBatch } from "./nuvemshop";
import { fetchOnlineSoftwareImportBatch } from "./online-software";
import type { TDataConnectorFetchInput, TDataConnectorKind, TCanonicalImportBatch } from "./types";

export * from "./types";

export async function fetchConnectorImportBatch(input: TDataConnectorFetchInput): Promise<TCanonicalImportBatch> {
	if (input.config.tipo === "CARDAPIO-WEB") {
		return fetchCardapioWebImportBatch({
			organizationId: input.organizationId,
			config: input.config,
			window: input.window,
		});
	}

	if (input.config.tipo === "ONLINE-SOFTWARE") {
		return fetchOnlineSoftwareImportBatch({
			organizationId: input.organizationId,
			config: input.config,
			window: input.window,
		});
	}

	if (input.config.tipo === "NUVEM-SHOP") {
		return fetchNuvemshopImportBatch({
			organizationId: input.organizationId,
			config: input.config,
			window: input.window,
		});
	}

	throw new Error(`Integração não suportada: ${(input.config as { tipo?: TDataConnectorKind }).tipo ?? "NÃO DEFINIDA"}`);
}
