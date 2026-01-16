import type {
	TCampaignTriggerTypeEnum,
	TCashbackProgramAccumulationTypeEnum,
	TInteractionsCronJobTimeBlocksEnum,
	TTimeDurationUnitsEnum,
} from "@/schemas/enums";

export const OrganizationNicheOptions: { id: number; label: string; value: string }[] = [
	{ id: 1, label: "ALIMENTAÇÃO", value: "ALIMENTAÇÃO" },
	{ id: 2, label: "CONSTRUÇÃO", value: "CONSTRUÇÃO" },
	{ id: 3, label: "MODA", value: "MODA" },
	{ id: 4, label: "PERFUMARIA", value: "PERFUMARIA" },
];

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
	{ id: 5, label: "CASHBACK ACUMULADO", value: "CASHBACK-ACUMULADO" },
	{ id: 6, label: "CASHBACK EXPIRANDO", value: "CASHBACK-EXPIRANDO" },
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

export const UnitsOfMeasurementOptions: { id: number; label: string; value: string }[] = [
	{ id: 1, label: "UN", value: "UN" }, // Unidade
	{ id: 2, label: "KG", value: "KG" }, // Quilograma
	{ id: 3, label: "G", value: "G" }, // Grama
	{ id: 4, label: "MG", value: "MG" }, // Miligrama
	{ id: 5, label: "L", value: "L" }, // Litro
	{ id: 6, label: "ML", value: "ML" }, // Mililitro
	{ id: 7, label: "DZ", value: "DZ" }, // Dúzia
	{ id: 8, label: "CX", value: "CX" }, // Caixa
	{ id: 9, label: "PC", value: "PC" }, // Peça
	{ id: 10, label: "SC", value: "SC" }, // Saco
	{ id: 11, label: "FARDO", value: "FARDO" }, // Fardo
	{ id: 12, label: "BANDEJA", value: "BANDEJA" }, // Bandeja
	{ id: 13, label: "ROLO", value: "ROLO" }, // Rolo
	{ id: 14, label: "POTE", value: "POTE" }, // Pote
	{ id: 15, label: "FRASCO", value: "FRASCO" }, // Frasco
	{ id: 16, label: "GALÃO", value: "GALÃO" }, // Galão
	{ id: 17, label: "LATA", value: "LATA" }, // Lata
	{ id: 18, label: "PACOTE", value: "PACOTE" }, // Pacote
	{ id: 19, label: "BARRA", value: "BARRA" }, // Barra
	{ id: 20, label: "FATIA", value: "FATIA" }, // Fatia
];
