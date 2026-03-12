import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { relations } from "drizzle-orm";
import { index, integer, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable, users } from ".";
import { whatsappTemplateCategoryEnum, whatsappTemplateQualityEnum, whatsappTemplateStatusEnum } from "./enums";
import { organizations } from "./organizations";
import { whatsappConnectionPhones } from "./whatsapp-connections";

export const messageTemplateGroups = newTable("message_template_groups", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 })
		.references(() => organizations.id, { onDelete: "cascade" })
		.notNull(),
	nome: text("nome").notNull(),
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const messageTemplateGroupRelations = relations(messageTemplateGroups, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [messageTemplateGroups.organizacaoId],
		references: [organizations.id],
	}),
	autor: one(users, {
		fields: [messageTemplateGroups.autorId],
		references: [users.id],
	}),
	versoes: many(messageTemplateVersions),
}));
export type TMessageTemplateGroup = typeof messageTemplateGroups.$inferSelect;
export type TNewMessageTemplateGroup = typeof messageTemplateGroups.$inferInsert;

export const messageTemplateVersions = newTable("message_template_versions", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	grupoId: varchar("grupo_id", { length: 255 })
		.references(() => messageTemplateGroups.id, { onDelete: "cascade" })
		.notNull(),
	versao: integer("versao").notNull(),
	metaNome: text("meta_nome").notNull(),
	categoria: whatsappTemplateCategoryEnum("categoria").notNull(),
	componentes: jsonb("componentes").$type<TWhatsappTemplateComponents>().notNull(),
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const messageTemplateVersionRelations = relations(messageTemplateVersions, ({ one, many }) => ({
	grupo: one(messageTemplateGroups, {
		fields: [messageTemplateVersions.grupoId],
		references: [messageTemplateGroups.id],
	}),
	autor: one(users, {
		fields: [messageTemplateVersions.autorId],
		references: [users.id],
	}),
	telefones: many(messageTemplateVersionPhones),
}));
export type TMessageTemplateVersion = typeof messageTemplateVersions.$inferSelect;
export type TNewMessageTemplateVersion = typeof messageTemplateVersions.$inferInsert;

export const messageTemplateVersionPhones = newTable(
	"message_template_version_phones",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		versaoId: varchar("versao_id", { length: 255 })
			.references(() => messageTemplateVersions.id, { onDelete: "cascade" })
			.notNull(),
		telefoneId: varchar("telefone_id", { length: 255 })
			.references(() => whatsappConnectionPhones.id, { onDelete: "cascade" })
			.notNull(),
		whatsappTemplateId: varchar("whatsapp_template_id", { length: 255 }),
		status: whatsappTemplateStatusEnum("status").notNull().default("PENDENTE"),
		qualidade: whatsappTemplateQualityEnum("qualidade").notNull().default("PENDENTE"),
		rejeicao: text("rejeicao"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
	},
	(table) => [index("msg_tmpl_version_phones_whatsapp_template_id_idx").on(table.whatsappTemplateId)],
);
export const messageTemplateVersionPhonesRelations = relations(messageTemplateVersionPhones, ({ one }) => ({
	versao: one(messageTemplateVersions, {
		fields: [messageTemplateVersionPhones.versaoId],
		references: [messageTemplateVersions.id],
	}),
	telefone: one(whatsappConnectionPhones, {
		fields: [messageTemplateVersionPhones.telefoneId],
		references: [whatsappConnectionPhones.id],
	}),
}));
export type TMessageTemplateVersionPhone = typeof messageTemplateVersionPhones.$inferSelect;
export type TNewMessageTemplateVersionPhone = typeof messageTemplateVersionPhones.$inferInsert;
