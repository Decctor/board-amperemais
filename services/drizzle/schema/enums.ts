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

export const whatsappTemplateCategoryEnum = pgEnum("whatsapp_template_category", ["AUTENTICAÇÃO", "MARKETING", "UTILIDADE"]);
export const whatsappTemplateParametersTypeEnum = pgEnum("whatsapp_template_parameters_type", ["NOMEADO", "POSICIONAL"]);
export const whatsappTemplateStatusEnum = pgEnum("whatsapp_template_status", [
	"RASCUNHO",
	"PENDENTE",
	"APROVADO",
	"REJEITADO",
	"PAUSADO",
	"DESABILITADO",
]);
export const whatsappTemplateQualityEnum = pgEnum("whatsapp_template_quality", ["PENDENTE", "ALTA", "MEDIA", "BAIXA"]);

export const cashbackProgramAccumulationTypeEnum = pgEnum("cashback_program_accumulation_type", ["FIXO", "PERCENTUAL"]);

export const cashbackProgramTransactionTypeEnum = pgEnum("cashback_program_transaction_type", ["ACÚMULO", "RESGATE", "EXPIRAÇÃO"]);

export const cashbackProgramTransactionStatusEnum = pgEnum("cashback_program_transaction_status", ["ATIVO", "CONSUMIDO", "EXPIRADO"]);
