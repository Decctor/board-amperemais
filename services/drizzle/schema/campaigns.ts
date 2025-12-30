import { relations } from "drizzle-orm";
import { boolean, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable, users, whatsappTemplates } from ".";
import { campaignTriggerTypeEnum, interactionsCronJobTimeBlocksEnum, timeDurationUnitsEnum } from "./enums";
import { organizations } from "./organizations";

export const campaigns = newTable("campaigns", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
	ativo: boolean("ativo").notNull().default(true),
	titulo: text("titulo").notNull(),
	descricao: text("descricao"),
	gatilhoTipo: campaignTriggerTypeEnum("gatilho_tipo").notNull(),
	// specific for "PERMANÊNCIA-SEGMENTAÇÃO"
	gatilhoTempoPermanenciaMedida: timeDurationUnitsEnum("gatilho_tempo_permanencia_medida"),
	gatilhoTempoPermanenciaValor: integer("gatilho_tempo_permanencia_valor"),

	execucaoAgendadaMedida: timeDurationUnitsEnum("execucao_agendada_medida").notNull().default("DIAS"),
	execucaoAgendadaValor: integer("execucao_agendada_valor").notNull().default(0),
	execucaoAgendadaBloco: interactionsCronJobTimeBlocksEnum("execucao_agendada_bloco").notNull(),
	// Whatsapp specific
	whatsappTelefoneId: varchar("whatsapp_telefone_id", { length: 255 }),
	whatsappTemplateId: varchar("whatsapp_template_id", { length: 255 })
		.references(() => whatsappTemplates.id)
		.notNull(),
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const campaignRelations = relations(campaigns, ({ many, one }) => ({
	segmentacoes: many(campaignSegmentations),
	whatsappTemplate: one(whatsappTemplates, {
		fields: [campaigns.whatsappTemplateId],
		references: [whatsappTemplates.id],
	}),
	autor: one(users, {
		fields: [campaigns.autorId],
		references: [users.id],
	}),
}));

export const campaignSegmentations = newTable("campaign_segmentations", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
	campanhaId: varchar("campanha_id", { length: 255 })
		.references(() => campaigns.id)
		.notNull(),
	segmentacao: text("segmentacao").notNull(),
});
export const campaignSegmentationRelations = relations(campaignSegmentations, ({ one }) => ({
	campanha: one(campaigns, {
		fields: [campaignSegmentations.campanhaId],
		references: [campaigns.id],
	}),
}));
