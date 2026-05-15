import { fetchCardapioWebImportBatch } from "./cardapio-web/canonical";
import { fetchIfoodImportBatch } from "./ifood";
import { fetchNuvemshopImportBatch } from "./nuvemshop";
import { fetchOnlineSoftwareImportBatch } from "./online-software";
import type { TCanonicalImportBatch, TDataConnectorFetchInput, TDataConnectorKind } from "./types";

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
			config: input.config as unknown as Parameters<typeof fetchNuvemshopImportBatch>[0]["config"],
			window: input.window,
		});
	}

	if (input.config.tipo === "IFOOD") {
		return fetchIfoodImportBatch({
			organizationId: input.organizationId,
			config: input.config,
			window: input.window,
		});
	}

	throw new Error(`Integracao nao suportada: ${(input.config as { tipo?: TDataConnectorKind }).tipo ?? "NAO DEFINIDA"}`);
}
