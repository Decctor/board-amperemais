import type {
	TCampaignTriggerTypeEnum,
	TCashbackProgramAccumulationTypeEnum,
	TInteractionsCronJobTimeBlocksEnum,
	TTimeDurationUnitsEnum,
} from "@/schemas/enums";

export const CustomersAcquisitionChannels = [
	{ id: 1, label: "ANUNCIO GOOGLE", value: "ANUNCIO GOOGLE" },
	{ id: 2, label: "ANUNCIO FB", value: "ANUNCIO FB" },
	{ id: 3, label: "ANUNCIO INSTA", value: "ANUNCIO INSTA" },
	{ id: 4, label: "BIO INSTA", value: "BIO INSTA" },
	{ id: 5, label: "CRM INTERNO", value: "CRM INTERNO" },
	{ id: 6, label: "INDICAÇÃO", value: "INDICAÇÃO" },
	{ id: 7, label: "COLD CALL", value: "COLD CALL" },
	{ id: 8, label: "WhatsApp Recp.", value: "WhatsApp Recp." },
	{ id: 9, label: "Landing Page", value: "Landing Page" },
];

export const CampaignTriggerTypeOptions: { id: number; label: string; value: TCampaignTriggerTypeEnum }[] = [
	{ id: 1, label: "NOVA COMPRA", value: "NOVA-COMPRA" },
	{ id: 2, label: "PRIMEIRA COMPRA", value: "PRIMEIRA-COMPRA" },
	{ id: 3, label: "PERMANÊNCIA NA SEGMENTAÇÃO", value: "PERMANÊNCIA-SEGMENTAÇÃO" },
	{ id: 4, label: "ENTRADA NA SEGMENTAÇÃO", value: "ENTRADA-SEGMENTAÇÃO" },
];

export const TimeDurationUnitsOptions: { id: number; label: string; value: TTimeDurationUnitsEnum }[] = [
	{ id: 1, label: "DIAS", value: "DIAS" },
	{ id: 2, label: "SEMANAS", value: "SEMANAS" },
	{ id: 3, label: "MESES", value: "MESES" },
	{ id: 4, label: "ANOS", value: "ANOS" },
];

export const InteractionsCronJobTimeBlocksOptions: { id: number; label: string; value: TInteractionsCronJobTimeBlocksEnum }[] = [
	{ id: 1, label: "00:00", value: "00:00" },
	{ id: 2, label: "03:00", value: "03:00" },
	{ id: 3, label: "06:00", value: "06:00" },
	{ id: 4, label: "09:00", value: "09:00" },
	{ id: 5, label: "12:00", value: "12:00" },
	{ id: 6, label: "15:00", value: "15:00" },
	{ id: 7, label: "18:00", value: "18:00" },
	{ id: 8, label: "21:00", value: "21:00" },
];

export const CashbackProgramAccumulationTypeOptions: { id: number; label: string; value: TCashbackProgramAccumulationTypeEnum }[] = [
	{ id: 1, label: "FIXO", value: "FIXO" },
	{ id: 2, label: "PERCENTUAL", value: "PERCENTUAL" },
];
