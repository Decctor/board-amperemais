import { relations } from "drizzle-orm";
import { doublePrecision, index, integer, text, timestamp, varchar, vector } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { saleItems } from "./sales";

export const products = newTable(
	"products",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
		descricao: text("descricao").notNull(),
		imagemCapaUrl: text("imagem_capa_url"),
		codigo: text("codigo").notNull(),
		unidade: text("unidade").notNull(),
		quantidade: doublePrecision("quantidade"),
		precoVenda: doublePrecision("preco_venda"),
		precoCusto: doublePrecision("preco_custo"),
		ncm: text("ncm").notNull(),
		tipo: text("tipo").notNull(),
		grupo: text("grupo").notNull(),
		dataUltimaSincronizacao: timestamp("data_ultima_sincronizacao"),
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
