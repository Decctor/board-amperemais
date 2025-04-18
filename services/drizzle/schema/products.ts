import { doublePrecision, text, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";

export const products = newTable("products", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	descricao: text("descricao").notNull(),
	codigo: text("codigo").notNull().unique(),
	unidade: text("unidade").notNull(),
	ncm: text("ncm").notNull(),
	tipo: text("tipo").notNull(),
	grupo: text("grupo").notNull(),
	// valorUnitario: doublePrecision("valor_unitario").notNull(),
});
export type TProductEntity = typeof products.$inferSelect;
export type TNewProductEntity = typeof products.$inferInsert;
