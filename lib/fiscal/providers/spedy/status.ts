import type { TProviderDocumentDetails } from "@/lib/fiscal/types";
import type { TSpedyEnvironmentType, TSpedyInvoiceResponse, TSpedyInvoiceStatus } from "./types";

export function mapSpedyEnvironment(value: TSpedyEnvironmentType | null | undefined): TProviderDocumentDetails["ambiente"] {
	return value === "production" ? "PRODUCAO" : "HOMOLOGACAO";
}

export function mapFiscalEnvironmentToSpedy(value: "HOMOLOGACAO" | "PRODUCAO" | null | undefined): TSpedyEnvironmentType {
	return value === "PRODUCAO" ? "production" : "development";
}

function mapDocumentStatus(status: TSpedyInvoiceStatus | null | undefined): TProviderDocumentDetails["status"] {
	switch (status) {
		case "authorized":
			return "AUTORIZADA";
		case "canceled":
			return "CANCELADA";
		case "disabled":
			return "INUTILIZADA";
		default:
			return "PENDENTE";
	}
}

function mapLifecycleStatus(status: TSpedyInvoiceStatus | null | undefined): TProviderDocumentDetails["statusInterno"] {
	switch (status) {
		case "authorized":
			return "AUTORIZADO";
		case "canceled":
			return "CANCELADO";
		case "disabled":
			return "INUTILIZADO";
		case "rejected":
		case "denied":
			return "REJEITADO";
		case "removed":
			return "ERRO";
		default:
			return "EM_PROCESSAMENTO";
	}
}

export function mapSpedyInvoiceResponse(response: TSpedyInvoiceResponse): TProviderDocumentDetails {
	const messages = [response.processingDetail?.message].filter((message): message is string => !!message);
	return {
		id: response.id,
		status: mapDocumentStatus(response.status),
		statusInterno: mapLifecycleStatus(response.status),
		ambiente: mapSpedyEnvironment(response.environmentType),
		chaveAcesso: response.accessKey ?? null,
		numero: response.number?.toString() ?? null,
		serie: response.series ?? null,
		protocolo: response.authorization?.protocol ?? null,
		dataEmissao: response.issuedOn ? new Date(response.issuedOn) : null,
		dataAutorizacao: response.authorization?.date ? new Date(response.authorization.date) : null,
		codigoStatus: response.processingDetail?.code ?? null,
		mensagens: messages,
		provedorRetorno: response as unknown as Record<string, unknown>,
	};
}
