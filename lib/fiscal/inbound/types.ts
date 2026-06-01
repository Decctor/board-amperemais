import type { TFiscalInboundManifestEventEnum } from "@/schemas/enums";
import type { TFiscalOrganization } from "../types";

export type TInboundDistribuicaoDocumento = {
	nsu: string;
	chaveAcesso: string;
	completo: boolean;
	emitenteCnpj?: string | null;
	emitenteNome?: string | null;
	valorTotal?: number | null;
	dataEmissao?: Date | null;
	situacao?: string | null;
	xml?: ArrayBuffer | null;
	resumoPayload?: Record<string, unknown> | null;
};

export type TInboundDistribuicaoResult = {
	ultNSU: string;
	maxNSU: string;
	documentos: TInboundDistribuicaoDocumento[];
};

export type TInboundManifestInput = {
	chaveAcesso: string;
	evento: TFiscalInboundManifestEventEnum;
	justificativa?: string | null;
};

export type TInboundManifestResult = {
	registrado: boolean;
	protocolo?: string | null;
	mensagens?: unknown[];
};

export interface IFiscalInboundProvider {
	consultarDistribuicao(input: { ultNSU: string }, organizacao: TFiscalOrganization): Promise<TInboundDistribuicaoResult>;
	manifestarDocumento(input: TInboundManifestInput, organizacao: TFiscalOrganization): Promise<TInboundManifestResult>;
}

// Mapeamento dos eventos internos para os codigos de evento da SEFAZ.
export const MANIFEST_EVENT_CODES: Record<TFiscalInboundManifestEventEnum, string> = {
	CIENCIA: "210210",
	CONFIRMACAO: "210200",
	DESCONHECIMENTO: "210220",
	NAO_REALIZADA: "210240",
};
