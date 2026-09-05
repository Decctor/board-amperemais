import type {
	TFiscalDocumentEnvironmentEnum,
	TFiscalDocumentLifecycleStatusEnum,
	TFiscalDocumentStatusEnum,
	TFiscalDocumentTypeEnum,
	TFiscalOperationConsumerPresenceEnum,
	TFiscalOperationFinalityEnum,
} from "@/schemas/enums";

/**
 * Rotulos e cores dos enums fiscais compartilhados pelas abas do modulo (documentos e
 * configuracao). Um unico lugar para que a serie na configuracao e o documento na lista falem
 * do mesmo "HOMOLOGACAO" com a mesma cor.
 */

export const FISCAL_DOCUMENT_STATUS_LABELS: Record<TFiscalDocumentStatusEnum, string> = {
	PENDENTE: "PENDENTE",
	AUTORIZADA: "AUTORIZADA",
	CANCELADA: "CANCELADA",
	INUTILIZADA: "INUTILIZADA",
};

export const FISCAL_LIFECYCLE_STATUS_LABELS: Record<TFiscalDocumentLifecycleStatusEnum, string> = {
	RASCUNHO: "RASCUNHO",
	PRONTO_PARA_ENVIO: "PRONTO PARA ENVIO",
	EM_PROCESSAMENTO: "EM PROCESSAMENTO",
	AUTORIZADO: "AUTORIZADO",
	REJEITADO: "REJEITADO",
	CANCELAMENTO_PENDENTE: "CANCELAMENTO PENDENTE",
	CANCELADO: "CANCELADO",
	INUTILIZADO: "INUTILIZADO",
	ERRO: "ERRO",
};

export const FISCAL_LIFECYCLE_STATUS_STYLES: Record<TFiscalDocumentLifecycleStatusEnum, string> = {
	RASCUNHO: "bg-zinc-400 dark:bg-zinc-500 text-white",
	PRONTO_PARA_ENVIO: "bg-sky-500 dark:bg-sky-600 text-white",
	EM_PROCESSAMENTO: "bg-amber-500 dark:bg-amber-600 text-white",
	AUTORIZADO: "bg-green-500 dark:bg-green-600 text-white",
	REJEITADO: "bg-rose-500 dark:bg-rose-600 text-white",
	CANCELAMENTO_PENDENTE: "bg-orange-500 dark:bg-orange-600 text-white",
	CANCELADO: "bg-red-600 dark:bg-red-700 text-white",
	INUTILIZADO: "bg-zinc-500 dark:bg-zinc-600 text-white",
	ERRO: "bg-red-500 dark:bg-red-600 text-white",
};

export const FISCAL_ENVIRONMENT_LABELS: Record<TFiscalDocumentEnvironmentEnum, string> = {
	HOMOLOGACAO: "HOMOLOGAÇÃO",
	PRODUCAO: "PRODUÇÃO",
};

export const FISCAL_ENVIRONMENT_STYLES: Record<TFiscalDocumentEnvironmentEnum, string> = {
	HOMOLOGACAO: "bg-amber-500 dark:bg-amber-600 text-white",
	PRODUCAO: "bg-emerald-500 dark:bg-emerald-600 text-white",
};

export const FISCAL_DOCUMENT_TYPE_STYLES: Record<TFiscalDocumentTypeEnum, string> = {
	NFCE: "bg-blue-500 dark:bg-blue-600 text-white",
	NFE: "bg-indigo-500 dark:bg-indigo-600 text-white",
	NFSE: "bg-teal-500 dark:bg-teal-600 text-white",
};

export const FISCAL_FINALITY_LABELS: Record<TFiscalOperationFinalityEnum, string> = {
	NORMAL: "NORMAL",
	COMPLEMENTAR: "COMPLEMENTAR",
	AJUSTE: "AJUSTE",
	DEVOLUCAO: "DEVOLUÇÃO",
};

export const FISCAL_CONSUMER_PRESENCE_LABELS: Record<TFiscalOperationConsumerPresenceEnum, string> = {
	NAO_SE_APLICA: "NÃO SE APLICA",
	OPERACAO_PRESENCIAL: "PRESENCIAL",
	INTERNET: "INTERNET",
	TELEATENDIMENTO: "TELEATENDIMENTO",
	ENTREGA_DOMICILIO: "ENTREGA À DOMICÍLIO",
};
