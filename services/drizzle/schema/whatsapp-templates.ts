import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { relations } from "drizzle-orm";
import { jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable, users } from ".";
import { whatsappTemplateCategoryEnum, whatsappTemplateQualityEnum, whatsappTemplateStatusEnum } from "./enums";

export const whatsappTemplates = newTable("whatsapp_templates", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	status: whatsappTemplateStatusEnum("status").notNull(),
	nome: text("nome").notNull(),
	categoria: whatsappTemplateCategoryEnum("categoria").notNull(),
	whatsappTemplateId: varchar("whatsapp_template_id", { length: 255 }),
	qualidade: whatsappTemplateQualityEnum("qualidade").notNull(),
	rejeicao: text("rejeicao"),
	componentes: jsonb("componentes").$type<TWhatsappTemplateComponents>().notNull(),
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const whatsappTemplateRelations = relations(whatsappTemplates, ({ one }) => ({
	autor: one(users, {
		fields: [whatsappTemplates.autorId],
		references: [users.id],
	}),
}));
