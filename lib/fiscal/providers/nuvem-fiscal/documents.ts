import type { IFiscalProvider, TCancelDocumentInput, TProviderDocumentDetails, TFiscalOrganization, TFiscalSaleContext } from "@/lib/fiscal/types";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import axios from "axios";
import { inspect } from "node:util";
import { createNuvemFiscalClient } from "./client";
import { mapSaleContextToNfcePayload } from "./mappers/nfce";
import { mapSaleContextToNfePayload } from "./mappers/nfe";
import type { TNuvemFiscalCancelResponse, TNuvemFiscalDfeResponse } from "./types";

function getClient(organizacao: TFiscalOrganization) {
	return createNuvemFiscalClient({
		baseUrl: organizacao.fiscalConfiguracao?.nuvemFiscal.api.baseUrl,
		apiToken: organizacao.fiscalConfiguracao?.nuvemFiscal.api.apiToken,
	});
}

function mapDfeStatus(status: TNuvemFiscalDfeResponse["status"]): TProviderDocumentDetails["status"] {
	switch (status) {
		case "autorizado":
			return "AUTORIZADA";
		case "cancelado":
			return "CANCELADA";
		default:
			return "PENDENTE";
	}
}

function mapLifecycleStatus(status: TNuvemFiscalDfeResponse["status"]): TProviderDocumentDetails["statusInterno"] {
	switch (status) {
		case "autorizado":
			return "AUTORIZADO";
		case "cancelado":
			return "CANCELADO";
		case "rejeitado":
		case "denegado":
			return "REJEITADO";
		case "erro":
			return "ERRO";
		default:
			return "EM_PROCESSAMENTO";
	}
}

function toEnvironment(value: "homologacao" | "producao") {
	return value === "producao" ? "PRODUCAO" : "HOMOLOGACAO";
}

function formatNuvemFiscalErrorPayload(data: unknown): string {
	if (data === undefined) return "undefined";
	if (typeof data === "string") return data;
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		return inspect(data, { depth: null, maxArrayLength: null, maxStringLength: null });
	}
}

function mapDfeResponse(response: TNuvemFiscalDfeResponse): TProviderDocumentDetails {
	return {
		id: response.id,
		status: mapDfeStatus(response.status),
		statusInterno: mapLifecycleStatus(response.status),
		ambiente: toEnvironment(response.ambiente),
		chaveAcesso: response.chave ?? null,
		numero: response.numero?.toString() ?? null,
		serie: response.serie?.toString() ?? null,
		protocolo: response.autorizacao?.protocolo ?? null,
		dataEmissao: response.data_emissao ? new Date(response.data_emissao) : null,
		dataAutorizacao: response.autorizacao?.data_recebimento ? new Date(response.autorizacao.data_recebimento) : null,
		mensagens: response.mensagens ?? [],
		provedorRetorno: response as unknown as Record<string, unknown>,
	};
}

export async function emitNuvemFiscalDocument(context: TFiscalSaleContext, documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
	const client = getClient(context.organizacao);
	const path = documento.tipo === "NFCE" ? "/nfce" : "/nfe";
	const payload = documento.tipo === "NFCE" ? mapSaleContextToNfcePayload(context, documento) : mapSaleContextToNfePayload(context, documento);
	console.log("EMITIR DOCUMENTO", JSON.stringify(payload, null, 2));
	try {
		const { data } = await client.post<TNuvemFiscalDfeResponse>(path, payload);
		return {
			...mapDfeResponse(data),
			provedorPayload: payload as Record<string, unknown>,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.data !== undefined) {
			console.error(`[NUVEM_FISCAL] Error emitting document\n${formatNuvemFiscalErrorPayload(error.response.data)}`);
		} else {
			console.error("[NUVEM_FISCAL] Error emitting document", error);
		}
		throw error;
	}
}

export async function consultNuvemFiscalDocument(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails> {
	const client = getClient(organizacao);
	const path = documento.tipo === "NFCE" ? `/nfce/${documento.provedorDocumentoId}` : `/nfe/${documento.provedorDocumentoId}`;
	const { data } = await client.get<TNuvemFiscalDfeResponse>(path);
	return mapDfeResponse(data);
}

export async function syncNuvemFiscalDocument(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails> {
	const client = getClient(organizacao);
	const path = documento.tipo === "NFCE" ? `/nfce/${documento.provedorDocumentoId}/sincronizar` : `/nfe/${documento.provedorDocumentoId}/sincronizar`;
	await client.post(path);
	return consultNuvemFiscalDocument(documento, organizacao);
}

export async function cancelNuvemFiscalDocument(
	input: TCancelDocumentInput,
	documento: TFiscalDocument,
	organizacao: TFiscalOrganization,
): Promise<TProviderDocumentDetails> {
	const client = getClient(organizacao);
	const path =
		documento.tipo === "NFCE" ? `/nfce/${documento.provedorDocumentoId}/cancelamento` : `/nfe/${documento.provedorDocumentoId}/cancelamento`;
	const { data } = await client.post<TNuvemFiscalCancelResponse>(path, { justificativa: input.reason });
	return {
		id: documento.provedorDocumentoId ?? documento.id,
		status: data.status === "registrado" ? "CANCELADA" : documento.status,
		statusInterno: data.status === "registrado" ? "CANCELADO" : "CANCELAMENTO_PENDENTE",
		ambiente: documento.ambiente,
		chaveAcesso: documento.chaveAcesso,
		numero: documento.numero,
		serie: documento.serie,
		protocolo: data.numero_protocolo ?? null,
		dataCancelamento: data.data_recebimento ? new Date(data.data_recebimento) : null,
		mensagens: data.motivo_status ? [data.motivo_status] : [],
		provedorRetorno: data as unknown as Record<string, unknown>,
	};
}

export async function downloadNuvemFiscalXml(documento: TFiscalDocument, organizacao: TFiscalOrganization) {
	if (!documento.provedorDocumentoId) return null;
	const client = getClient(organizacao);
	const path = documento.tipo === "NFCE" ? `/nfce/${documento.provedorDocumentoId}/xml` : `/nfe/${documento.provedorDocumentoId}/xml`;
	const { data } = await client.get<ArrayBuffer>(path, { responseType: "arraybuffer" });
	return data;
}

export async function downloadNuvemFiscalPdf(documento: TFiscalDocument, organizacao: TFiscalOrganization) {
	if (!documento.provedorDocumentoId) return null;
	const client = getClient(organizacao);
	const path = documento.tipo === "NFCE" ? `/nfce/${documento.provedorDocumentoId}/pdf` : `/nfe/${documento.provedorDocumentoId}/pdf`;
	const { data } = await client.get<ArrayBuffer>(path, { responseType: "arraybuffer" });
	return data;
}

export const nuvemFiscalDocumentMethods: Pick<
	IFiscalProvider,
	"emitirDocumento" | "consultarDocumento" | "sincronizarDocumento" | "cancelarDocumento" | "baixarXml" | "baixarPdf"
> = {
	emitirDocumento: emitNuvemFiscalDocument,
	consultarDocumento: consultNuvemFiscalDocument,
	sincronizarDocumento: syncNuvemFiscalDocument,
	cancelarDocumento: cancelNuvemFiscalDocument,
	baixarXml: downloadNuvemFiscalXml,
	baixarPdf: downloadNuvemFiscalPdf,
};
