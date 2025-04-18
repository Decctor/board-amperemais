import {
	doublePrecision,
	json,
	jsonb,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { clients } from "./clients";
import { relations } from "drizzle-orm";
import { products } from "./products";

export const sales = newTable("sales", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	clienteId: varchar("cliente_id", { length: 255 })
		.references(() => clients.id)
		.notNull(),
	idExterno: text("id_externo").notNull(),
	valorTotal: doublePrecision("valor_total").notNull(),
	custoTotal: doublePrecision("custo_total").notNull(),
	vendedor: text("vendedor").notNull(),
	// Other details
	parceiro: text("parceiro").notNull(),
	chave: text("chave").notNull(),
	documento: text("documento").notNull(),
	modelo: text("modelo").notNull(),
	movimento: text("movimento").notNull(),
	natureza: text("natureza").notNull(),
	serie: text("serie").notNull(),
	situacao: text("situacao").notNull(),
	tipo: text("tipo").notNull(),
	dataVenda: timestamp("data_venda"),
});
export type TSaleEntity = typeof sales.$inferSelect;
export type TNewSaleEntity = typeof sales.$inferInsert;

export const salesRelations = relations(sales, ({ one, many }) => ({
	cliente: one(clients, {
		fields: [sales.clienteId],
		references: [clients.id],
	}),
	itens: many(saleItems),
}));

export const saleItems = newTable("sale_items", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	vendaId: varchar("venda_id", { length: 255 })
		.references(() => sales.id, { onDelete: "cascade" })
		.notNull(),
	clienteId: varchar("cliente_id", { length: 255 })
		.references(() => clients.id, { onDelete: "cascade" })
		.notNull(),
	produtoId: varchar("produto_id", { length: 255 })
		.references(() => products.id)
		.notNull(),
	quantidade: doublePrecision("quantidade").notNull(),
	valorVendaUnitario: doublePrecision("valor_unitario").notNull(), // valor de venda unitário do produto
	valorCustoUnitario: doublePrecision("valor_custo_unitario").notNull(), // valor de custo unitário do produto
	valorVendaTotalBruto: doublePrecision("valor_venda_total_bruto").notNull(), // valor total do produto (sem desconto) (quantidade * valorUnitario)
	valorTotalDesconto: doublePrecision("valor_total_desconto").notNull(), // valor total em desconto
	valorVendaTotalLiquido: doublePrecision(
		"valor_venda_total_liquido",
	).notNull(), // valor total do produto na venda (com desconto) (quantidade * valorUnitario - valorTotalDesconto)
	valorCustoTotal: doublePrecision("valor_custo_total").notNull(), // valor total de custos,
	metadados: jsonb("metadados"), // metadados do produto (JSONB)
});
export const saleItemsRelations = relations(saleItems, ({ one }) => ({
	produto: one(products, {
		fields: [saleItems.produtoId],
		references: [products.id],
	}),
	venda: one(sales, {
		fields: [saleItems.vendaId],
		references: [sales.id],
	}),
}));
export type TSaleItemEntity = typeof saleItems.$inferSelect;
export type TNewSaleItemEntity = typeof saleItems.$inferInsert;
