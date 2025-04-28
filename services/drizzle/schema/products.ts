import { doublePrecision, index, text, timestamp, varchar, vector } from "drizzle-orm/pg-core";
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
		codigo: text("codigo").notNull(),
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

export const productEmbeddings = newTable("product_embeddings", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	produtoId: varchar("produto_id", { length: 255 })
		.references(() => products.id)
		.notNull(),
	embedding: vector("embedding", { dimensions: 1536 }).notNull(),
	dataInsercao: timestamp("data_insercao").notNull().defaultNow(),
	dataAtualizacao: timestamp("data_atualizacao")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
