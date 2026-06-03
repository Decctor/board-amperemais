import { inspect } from "node:util";
import type { TNuvemFiscalDfeResponse } from "./types";

function pushMessage(messages: string[], value: unknown) {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed) messages.push(trimmed);
		return;
	}

	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		if (typeof record.mensagem === "string") pushMessage(messages, record.mensagem);
		if (typeof record.message === "string") pushMessage(messages, record.message);
		if (typeof record.motivo_status === "string") pushMessage(messages, record.motivo_status);
		if (typeof record.descricao === "string") pushMessage(messages, record.descricao);
	}
}

/** Consolida motivos de rejeicao/erro retornados pela Nuvem Fiscal (SEFAZ + API). */
export function extractNuvemFiscalDfeMessages(response: TNuvemFiscalDfeResponse): string[] {
	const messages: string[] = [];

	pushMessage(messages, response.motivo_status);
	pushMessage(messages, response.autorizacao?.motivo_status);

	const codigoStatus = response.autorizacao?.codigo_status ?? response.codigo_status;
	if (codigoStatus != null) {
		const motivo = response.autorizacao?.motivo_status ?? response.motivo_status;
		const line = motivo ? `SEFAZ ${codigoStatus}: ${motivo}` : `SEFAZ ${codigoStatus}`;
		if (!messages.some((message) => message.includes(String(codigoStatus)))) {
			messages.unshift(line);
		}
	}

	if (Array.isArray(response.mensagens)) {
		for (const item of response.mensagens) {
			if (typeof item === "string" || (item && typeof item === "object")) {
				pushMessage(messages, item);
			} else if (item != null) {
				messages.push(String(item));
			}
		}
	}

	return [...new Set(messages)];
}

export function formatNuvemFiscalPayloadForLog(data: unknown): string {
	if (data === undefined) return "undefined";
	if (typeof data === "string") return data;
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		return inspect(data, { depth: null, maxArrayLength: null, maxStringLength: null });
	}
}

type TNuvemFiscalEmissionPayloadPreview = {
	ambiente?: string;
	referencia?: string;
	infNFe?: {
		ide?: { tpAmb?: number; serie?: number; nNF?: number };
		emit?: { CNPJ?: string; IE?: string; CRT?: number; xNome?: string };
	};
};

/** Log do payload enviado na emissao (terminal do servidor / npm run dev). */
export function logNuvemFiscalEmissionRequest({
	path,
	documentoFiscalId,
	tipo,
	vendaId,
	payload,
	fiscalConfigIe,
}: {
	path: string;
	documentoFiscalId: string;
	tipo: string;
	vendaId?: string | null;
	payload: unknown;
	/** IE lida do fiscalConfiguracao antes do mapper (comparar com emit.IE do payload). */
	fiscalConfigIe?: string | null;
}) {
	const preview = payload as TNuvemFiscalEmissionPayloadPreview;

	console.info("[NUVEM_FISCAL] Enviando documento fiscal", {
		path,
		documentoFiscalId,
		tipo,
		vendaId: vendaId ?? null,
		ambientePayload: preview.ambiente ?? null,
		referencia: preview.referencia ?? null,
		fiscalConfigIe: fiscalConfigIe ?? null,
		emitente: preview.infNFe?.emit
			? {
					CNPJ: preview.infNFe.emit.CNPJ ?? null,
					IE: preview.infNFe.emit.IE ?? null,
					CRT: preview.infNFe.emit.CRT ?? null,
					xNome: preview.infNFe.emit.xNome ?? null,
				}
			: null,
		ide: preview.infNFe?.ide
			? {
					tpAmb: preview.infNFe.ide.tpAmb ?? null,
					serie: preview.infNFe.ide.serie ?? null,
					nNF: preview.infNFe.ide.nNF ?? null,
				}
			: null,
	});

	console.info(`[NUVEM_FISCAL] Payload de emissao (${path}):\n${formatNuvemFiscalPayloadForLog(payload)}`);
}

const NON_SUCCESS_STATUSES = new Set<TNuvemFiscalDfeResponse["status"]>(["rejeitado", "denegado", "erro"]);

export function logNuvemFiscalDfeOutcome(
	action: "emitir" | "consultar" | "sincronizar",
	response: TNuvemFiscalDfeResponse,
	context?: { documentoFiscalId?: string; tipo?: string },
) {
	if (!NON_SUCCESS_STATUSES.has(response.status) && response.status !== "pendente") {
		return;
	}

	const mensagens = extractNuvemFiscalDfeMessages(response);
	const codigoStatus = response.autorizacao?.codigo_status ?? response.codigo_status ?? null;

	if (response.status === "pendente") {
		console.info("[NUVEM_FISCAL] Documento em processamento no provedor", {
			acao: action,
			documentoFiscalId: context?.documentoFiscalId,
			tipo: context?.tipo,
			provedorDocumentoId: response.id,
			status: response.status,
		});
		return;
	}

	console.warn("[NUVEM_FISCAL] Documento fiscal nao autorizado", {
		acao: action,
		documentoFiscalId: context?.documentoFiscalId,
		tipo: context?.tipo,
		provedorDocumentoId: response.id,
		status: response.status,
		codigoStatus,
		mensagens,
		chaveAcesso: response.chave ?? null,
		numero: response.numero ?? null,
		serie: response.serie ?? null,
	});

	if (mensagens.length === 0) {
		console.warn(`[NUVEM_FISCAL] Resposta completa do provedor (${action}):\n${formatNuvemFiscalPayloadForLog(response)}`);
	}
}
