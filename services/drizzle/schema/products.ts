import { doublePrecision, index, text, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { relations } from "drizzle-orm";
import { saleItems } from "./sales";

export const products = newTable(
	"products",
	{
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
	},
	(table) => ({
		// ...existing indices...
		grupoIdx: index("idx_products_grupo").on(table.grupo),
	}),
);
export const productsRelations = relations(products, ({ one, many }) => ({
	pedidos: many(saleItems),
}));

export type TProductEntity = typeof products.$inferSelect;
export type TNewProductEntity = typeof products.$inferInsert;
