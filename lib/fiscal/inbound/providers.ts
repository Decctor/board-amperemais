import { SpedyInboundProvider } from "@/lib/fiscal/providers/spedy/inbound";
import createHttpError from "http-errors";
import type { TFiscalOrganization } from "../types";
import type { IFiscalInboundProvider, TInboundListResult, TInboundManifestResult } from "./types";

// Stub sem provedor real: lista vazia e manifestacao recusada com mensagem clara.
class ManualInboundProvider implements IFiscalInboundProvider {
	async listDocuments({ checkpoint }: { checkpoint: string | null }): Promise<TInboundListResult> {
		return { documentos: [], checkpoint, hasMore: false };
	}

	async manifest(): Promise<TInboundManifestResult> {
		throw new createHttpError.BadRequest("Manifestacao indisponivel sem provedor fiscal configurado.");
	}
}

// Espelha getFiscalProvider (lib/fiscal/index.ts): o provedor inbound acompanha o de emissao.
export function resolveInboundProvider(organization: Pick<TFiscalOrganization, "fiscalProvedor">): IFiscalInboundProvider {
	switch (organization.fiscalProvedor) {
		case "SPEDY":
			return new SpedyInboundProvider();
		default:
			return new ManualInboundProvider();
	}
}
