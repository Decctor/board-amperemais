import { relations } from "drizzle-orm";
import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
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
