import { pgEnum } from "drizzle-orm/pg-core";

export const campaignTriggerTypeEnum = pgEnum("campaign_trigger_type", [
	"NOVA-COMPRA",
	"PRIMEIRA-COMPRA",
	"PERMANÊNCIA-SEGMENTAÇÃO",
	"ENTRADA-SEGMENTAÇÃO",
]);

export const timeDurationUnitsEnum = pgEnum("time_duration_units", ["DIAS", "SEMANAS", "MESES", "ANOS"]);

export const interactionTypeEnum = pgEnum("interaction_type", ["ENVIO-MENSAGEM", "ENVIO-EMAIL", "LIGAÇÃO", "ATENDIMENTO"]);
export const interactionsCronJobTimeBlocksEnum = pgEnum("interactions_cron_time_blocks", [
	"00:00",
	"03:00",
	"06:00",
	"09:00",
	"12:00",
	"15:00",
	"18:00",
	"21:00",
]);
