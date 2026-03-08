import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import { RFMLabels } from "@/utils/rfm";

export const RFM_SEGMENT_OPTIONS = RFMLabels.map((segmento, index) => ({
	id: index + 1,
	value: segmento.text,
	label: segmento.text,
}));

export const FLOW_TRIGGER_TO_CAMPAIGN_TRIGGER: Partial<Record<string, TCampaignTriggerTypeEnum>> = {
	"NOVA-COMPRA": "NOVA-COMPRA",
	"PRIMEIRA-COMPRA": "PRIMEIRA-COMPRA",
	"ENTRADA-SEGMENTACAO": "ENTRADA-SEGMENTAÇÃO",
	"PERMANENCIA-SEGMENTACAO": "PERMANÊNCIA-SEGMENTAÇÃO",
	"CASHBACK-ACUMULADO": "CASHBACK-ACUMULADO",
	"CASHBACK-EXPIRANDO": "CASHBACK-EXPIRANDO",
	ANIVERSARIO_CLIENTE: "ANIVERSARIO_CLIENTE",
	"QUANTIDADE-TOTAL-COMPRAS": "QUANTIDADE-TOTAL-COMPRAS",
	"VALOR-TOTAL-COMPRAS": "VALOR-TOTAL-COMPRAS",
	RECORRENTE: "RECORRENTE",
};

export const WHATSAPP_STATUS_OPTIONS = [
	{ id: 1, value: "PENDENTE", label: "PENDENTE" },
	{ id: 2, value: "ENVIADO", label: "ENVIADO" },
	{ id: 3, value: "ENTREGUE", label: "ENTREGUE" },
	{ id: 4, value: "LIDO", label: "LIDO" },
	{ id: 5, value: "FALHOU", label: "FALHOU" },
];
