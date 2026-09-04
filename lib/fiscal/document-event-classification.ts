import type { TFiscalDocumentEventTypeEnum, TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

const EVENT_TYPE_BY_STATUS: Record<TFiscalDocumentLifecycleStatusEnum, TFiscalDocumentEventTypeEnum> = {
	RASCUNHO: "CRIADO",
	PRONTO_PARA_ENVIO: "ENVIO_SOLICITADO",
	EM_PROCESSAMENTO: "PROCESSAMENTO_INICIADO",
	AUTORIZADO: "AUTORIZADO",
	REJEITADO: "REJEITADO",
	CANCELAMENTO_PENDENTE: "CANCELAMENTO_SOLICITADO",
	CANCELADO: "CANCELADO",
	INUTILIZADO: "INUTILIZACAO",
	ERRO: "ERRO",
};

export function classifyFiscalDocumentEvent(status: TFiscalDocumentLifecycleStatusEnum): TFiscalDocumentEventTypeEnum {
	return EVENT_TYPE_BY_STATUS[status];
}

export function describeFiscalEmissionResult({ status, messages }: { status: TFiscalDocumentLifecycleStatusEnum; messages: string[] }): string {
	if (status === "REJEITADO" || status === "ERRO") {
		const detail = messages.join("; ") || "sem motivo informado pelo provedor";
		return `Documento ${status.toLowerCase()}: ${detail}`;
	}
	if (status === "EM_PROCESSAMENTO") {
		return "Documento aceito pelo provedor e aguardando processamento.";
	}
	return `Documento retornou do provedor com status ${status}.`;
}
