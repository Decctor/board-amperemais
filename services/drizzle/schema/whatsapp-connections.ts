import { relations } from "drizzle-orm";
import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { users } from "./users";

export const whatsappConnections = newTable("whatsapp_connections", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 })
		.references(() => organizations.id)
		.notNull(),
	token: text("token").notNull(),
	dataExpiracao: timestamp("data_expiracao").notNull(),
	metaEscopo: text("meta_escopo").notNull(),
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const whatsappConnectionsRelations = relations(whatsappConnections, ({ many }) => ({
	telefones: many(whatsappConnectionPhones),
}));

export const whatsappConnectionPhones = newTable("whatsapp_connection_phones", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	conexaoId: varchar("conexao_id", { length: 255 })
		.references(() => whatsappConnections.id)
		.notNull(),
	nome: text("nome").notNull(),
	whatsappBusinessAccountId: varchar("whatsapp_business_account_id", { length: 255 }).notNull(),
	whatsappTelefoneId: varchar("whatsapp_telefone_id", { length: 255 }).notNull(),
	numero: text("numero").notNull(),
});
export const whatsappConnectionPhonesRelations = relations(whatsappConnectionPhones, ({ one }) => ({
	conexao: one(whatsappConnections, {
		fields: [whatsappConnectionPhones.conexaoId],
		references: [whatsappConnections.id],
	}),
}));
