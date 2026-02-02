import { relations } from "drizzle-orm";
import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { users } from "./users";

export const authSessions = newTable("auth_sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	usuarioId: varchar("usuario_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	usuarioAgente: text("usuario_agente"),
	usuarioDispositivo: text("usuario_dispositivo"),
	usuarioNavegador: text("usuario_navegador"),
	usuarioEnderecoIp: text("usuario_endereco_ip"),
	organizacaoAtivaId: varchar("organizacao_ativa_id", { length: 255 }).references(() => organizations.id, { onDelete: "set null" }),
	dataExpiracao: timestamp("data_expiracao").notNull(),
});
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	usuario: one(users, {
		fields: [authSessions.usuarioId],
		references: [users.id],
	}),
}));
export type TAuthSessionEntity = typeof authSessions.$inferSelect;
export type TNewAuthSessionEntity = typeof authSessions.$inferInsert;

export const authMagicLinks = newTable("auth_magic_links", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	usuarioId: varchar("usuario_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	token: text("token").notNull(),
	codigo: text("codigo").notNull(),
	dataExpiracao: timestamp("data_expiracao").notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const authMagicLinksRelations = relations(authMagicLinks, ({ one }) => ({
	usuario: one(users, {
		fields: [authMagicLinks.usuarioId],
		references: [users.id],
	}),
}));
export type TAuthMagicLinkEntity = typeof authMagicLinks.$inferSelect;
export type TNewAuthMagicLinkEntity = typeof authMagicLinks.$inferInsert;
