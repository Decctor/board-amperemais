import type { TUserPermissions } from "@/schemas/users";
import { relations } from "drizzle-orm";
import { boolean, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { sellers } from "./sellers";

export const users = newTable("users", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	admin: boolean("admin").notNull().default(false),
	organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
	nome: text("nome").notNull(),
	email: text("email").notNull(),
	telefone: text("telefone").notNull(),
	avatarUrl: text("avatar_url"),
	// Auth related
	usuario: text("usuario").notNull(),
	senha: text("senha").notNull(),
	permissoes: jsonb("permissoes").$type<TUserPermissions>().notNull(),
	// Others
	dataNascimento: timestamp("data_nascimento"),
	vendedorId: varchar("vendedor_id", { length: 255 }).references(() => sellers.id),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const usersRelations = relations(users, ({ one }) => ({
	vendedor: one(sellers, {
		fields: [users.vendedorId],
		references: [sellers.id],
	}),
	organizacao: one(organizations, {
		fields: [users.organizacaoId],
		references: [organizations.id],
	}),
}));
export type TUserEntity = typeof users.$inferSelect;
export type TNewUserEntity = typeof users.$inferInsert;
