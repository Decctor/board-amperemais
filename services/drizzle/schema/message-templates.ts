import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import { relations } from "drizzle-orm";
import { index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { messageTemplateCategoryEnum, messageTemplateStatusEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

export const messageTemplates = newTable(
	"message_templates",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		nome: text("nome").notNull(),
		status: messageTemplateStatusEnum("status").notNull().default("RASCUNHO"),
		alerta: text("alerta"),
		metadados: jsonb("metadados").$type<TMessageTemplateMetadata>().notNull(),
		conteudo: jsonb("conteudo").$type<TMessageTemplateContent>().notNull(),
		linguagem: varchar("linguagem", { length: 16 }).notNull().default("pt_BR"),
		categoria: messageTemplateCategoryEnum("categoria").notNull(),
		autorId: varchar("autor_id", { length: 255 })
			.references(() => users.id)
			.notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("message_templates_organizacao_nome_idx").on(table.organizacaoId, table.nome),
		index("message_templates_organizacao_status_idx").on(table.organizacaoId, table.status),
	],
);

export const messageTemplateRelations = relations(messageTemplates, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [messageTemplates.organizacaoId],
		references: [organizations.id],
	}),
	autor: one(users, {
		fields: [messageTemplates.autorId],
		references: [users.id],
	}),
}));

export type TMessageTemplate = typeof messageTemplates.$inferSelect;
export type TNewMessageTemplate = typeof messageTemplates.$inferInsert;
