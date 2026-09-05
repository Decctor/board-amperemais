import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

export const FISCAL_DOCUMENT_STATUS_FILTERS: {
	label: string;
	statuses: TFiscalDocumentLifecycleStatusEnum[];
}[] = [
	{ label: "TODOS", statuses: [] },
	{
		label: "PENDENTES",
		statuses: ["RASCUNHO", "PRONTO_PARA_ENVIO", "EM_PROCESSAMENTO"],
	},
	{ label: "ERROS E REJEIÇÕES", statuses: ["ERRO", "REJEITADO"] },
	{ label: "AUTORIZADOS", statuses: ["AUTORIZADO"] },
	{ label: "INUTILIZADOS", statuses: ["INUTILIZADO"] },
];
