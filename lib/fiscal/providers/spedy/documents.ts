import type {
	IFiscalProvider,
	TCancelDocumentInput,
	TFiscalCorrectionInput,
	TFiscalInutilizationInput,
	TProviderCorrectionResult,
	TProviderDocumentDetails,
	TProviderInutilizationResult,
	TFiscalOrganization,
	TFiscalSaleContext,
} from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import axios from "axios";
import createHttpError from "http-errors";
import { getSpedyCompanyClient } from "./client";
import { mapSaleContextToSpedyInvoicePayload } from "./mappers/invoice";
import { mapSpedyInvoiceResponse } from "./status";
import type { TSpedyDisablementResponse, TSpedyInvoiceResponse } from "./types";

function getInvoiceBasePath(documento: Pick<TFiscalDocument, "tipo">) {
	return documento.tipo === "NFCE" ? "/v1/consumer-invoices" : "/v1/product-invoices";
}

async function getSpedyInvoice(documento: TFiscalDocument, organizacao: TFiscalOrganization, action: "consultar" | "sincronizar" = "consultar") {
	if (!documento.provedorDocumentoId) throw new createHttpError.BadRequest("Documento fiscal sem ID na Spedy.");
	const client = getSpedyCompanyClient(organizacao);
	const basePath = getInvoiceBasePath(documento);
	const { data } =
		action === "sincronizar"
			? await client.post<TSpedyInvoiceResponse>(`${basePath}/${documento.provedorDocumentoId}/check-status`)
			: await client.get<TSpedyInvoiceResponse>(`${basePath}/${documento.provedorDocumentoId}`);
	return mapSpedyInvoiceResponse(data);
}

export async function emitSpedyDocument(context: TFiscalSaleContext, documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
	const client = getSpedyCompanyClient(context.organizacao);
	const basePath = getInvoiceBasePath(documento);
	const payload = mapSaleContextToSpedyInvoicePayload(context, documento);

	try {
		const { data } = await client.post<TSpedyInvoiceResponse>(basePath, payload);
		let response = data;
		if (data.status === "created") {
			await client.post(`${basePath}/${data.id}/issue`, { effectiveDate: new Date().toISOString() });
			const checked = await client.post<TSpedyInvoiceResponse>(`${basePath}/${data.id}/check-status`);
			response = checked.data;
		}
		return {
			...mapSpedyInvoiceResponse(response),
			provedorPayload: payload,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.data !== undefined) {
			console.error("[SPEDY] Erro ao emitir documento fiscal.", JSON.stringify(error.response.data, null, 2));
		} else {
			console.error("[SPEDY] Erro ao emitir documento fiscal.", error);
		}
		throw error;
	}
}

export async function consultSpedyDocument(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails> {
	return getSpedyInvoice(documento, organizacao, "consultar");
}

export async function syncSpedyDocument(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails> {
	return getSpedyInvoice(documento, organizacao, "sincronizar");
}

export async function cancelSpedyDocument(
	input: TCancelDocumentInput,
	documento: TFiscalDocument,
	organizacao: TFiscalOrganization,
): Promise<TProviderDocumentDetails> {
	if (!documento.provedorDocumentoId) throw new createHttpError.BadRequest("Documento fiscal sem ID na Spedy.");
	const client = getSpedyCompanyClient(organizacao);
	const { data } = await client.delete<TSpedyInvoiceResponse>(`${getInvoiceBasePath(documento)}/${documento.provedorDocumentoId}`, {
		data: { reason: input.reason },
	});
	const details = mapSpedyInvoiceResponse(data);
	return {
		...details,
		dataCancelamento: details.statusInterno === "CANCELADO" ? new Date() : null,
	};
}

export async function downloadSpedyXml(documento: TFiscalDocument, organizacao: TFiscalOrganization) {
	if (!documento.provedorDocumentoId) return null;
	const client = getSpedyCompanyClient(organizacao);
	const { data } = await client.get<ArrayBuffer>(`${getInvoiceBasePath(documento)}/${documento.provedorDocumentoId}/xml`, {
		responseType: "arraybuffer",
	});
	return data;
}

export async function downloadSpedyPdf(documento: TFiscalDocument, organizacao: TFiscalOrganization) {
	if (!documento.provedorDocumentoId) return null;
	const client = getSpedyCompanyClient(organizacao);
	const { data } = await client.get<ArrayBuffer>(`${getInvoiceBasePath(documento)}/${documento.provedorDocumentoId}/pdf`, {
		responseType: "arraybuffer",
	});
	return data;
}

export async function cartaCorrecaoSpedyDocument(
	input: TFiscalCorrectionInput,
	documento: TFiscalDocument,
	organizacao: TFiscalOrganization,
): Promise<TProviderCorrectionResult> {
	if (documento.tipo !== "NFE") throw new createHttpError.BadRequest("Carta de correcao disponivel apenas para NF-e.");
	if (!documento.provedorDocumentoId) throw new createHttpError.BadRequest("Documento fiscal sem ID na Spedy.");
	const client = getSpedyCompanyClient(organizacao);
	const { data } = await client.post<Record<string, unknown>>(`/v1/product-invoices/${documento.provedorDocumentoId}/corrections`, {
		letter: input.correcao,
	});
	return {
		sequenciaEvento: 1,
		protocolo: null,
		dataEvento: new Date(),
		provedorRetorno: data,
	};
}

export async function inutilizeSpedyNumber(
	input: TFiscalInutilizationInput,
	documento: TFiscalDocument,
	organizacao: TFiscalOrganization,
): Promise<TProviderInutilizationResult> {
	const numero = documento.numero ? Number(documento.numero) : null;
	if (!documento.serie || !numero) throw new createHttpError.BadRequest("Dados insuficientes para inutilizacao (serie ou numero).");
	const client = getSpedyCompanyClient(organizacao);
	const { data } = await client.post<TSpedyDisablementResponse>(`${getInvoiceBasePath(documento)}/disablement`, {
		initialNumber: numero,
		finalNumber: numero,
		series: Number(documento.serie),
		reason: input.justificativa,
	});
	return {
		status: "INUTILIZADA",
		protocolo: data.protocolNumber ?? null,
		dataEvento: data.date ? new Date(data.date) : new Date(),
		mensagens: [data.messageText].filter((message): message is string => !!message),
		provedorRetorno: data as unknown as Record<string, unknown>,
	};
}

export const spedyDocumentMethods: Pick<
	IFiscalProvider,
	| "emitirDocumento"
	| "consultarDocumento"
	| "sincronizarDocumento"
	| "cancelarDocumento"
	| "cartaCorrecaoDocumento"
	| "inutilizarNumeracao"
	| "baixarXml"
	| "baixarPdf"
> = {
	emitirDocumento: emitSpedyDocument,
	consultarDocumento: consultSpedyDocument,
	sincronizarDocumento: syncSpedyDocument,
	cancelarDocumento: cancelSpedyDocument,
	cartaCorrecaoDocumento: cartaCorrecaoSpedyDocument,
	inutilizarNumeracao: inutilizeSpedyNumber,
	baixarXml: downloadSpedyXml,
	baixarPdf: downloadSpedyPdf,
};
