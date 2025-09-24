import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";

export const sellers = newTable("sellers", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nome: text("nome").notNull(),
	identificador: text("identificador").notNull(),
	telefone: text("telefone"),
	email: text("email"),
	avatarUrl: text("avatar_url"),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
