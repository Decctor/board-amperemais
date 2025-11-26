import { relations } from "drizzle-orm";
import { doublePrecision, index, json, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { newTable } from "./common";
import { partners } from "./partners";
import { products } from "./products";
import { sellers } from "./sellers";

export const sales = newTable(
	"sales",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		clienteId: varchar("cliente_id", { length: 255 })
			.references(() => clients.id)
			.notNull(),
		idExterno: text("id_externo").notNull(),
		valorTotal: doublePrecision("valor_total").notNull(),
		custoTotal: doublePrecision("custo_total").notNull(),
		vendedorNome: text("vendedor_nome").notNull(),
		vendedorId: varchar("vendedor_id", { length: 255 }).references(() => sellers.id),
		// Partner
		parceiro: text("parceiro").notNull(),
		parceiroId: varchar("parceiro_id", { length: 255 }).references(() => partners.id),
		// Other details
		chave: text("chave").notNull(),
		documento: text("documento").notNull(),
		modelo: text("modelo").notNull(),
		movimento: text("movimento").notNull(),
		natureza: text("natureza").notNull(),
		serie: text("serie").notNull(),
		situacao: text("situacao").notNull(),
		tipo: text("tipo").notNull(),
		dataVenda: timestamp("data_venda"),
	},
	(table) => ({
		clientIdIdx: index("idx_sales_client_id").on(table.clienteId),
		parceiroIdx: index("idx_sales_parceiro").on(table.parceiro),
		dataVendaIdx: index("idx_sales_data_venda").on(table.dataVenda),
		vendedorIdx: index("idx_sales_vendedor").on(table.vendedorNome),
		naturezaIdx: index("idx_sales_natureza").on(table.natureza),
		valorTotalIdx: index("idx_sales_valor_total").on(table.valorTotal),
	}),
);
export type TSaleEntity = typeof sales.$inferSelect;
export type TNewSaleEntity = typeof sales.$inferInsert;

export const salesRelations = relations(sales, ({ one, many }) => ({
	cliente: one(clients, {
		fields: [sales.clienteId],
		references: [clients.id],
	}),
	vendedor: one(sellers, {
		fields: [sales.vendedorId],
		references: [sellers.id],
	}),
	parceiro: one(partners, {
		fields: [sales.parceiroId],
		references: [partners.id],
	}),
	itens: many(saleItems),
}));

export const saleItems = newTable(
	"sale_items",
	{
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
		valorVendaTotalLiquido: doublePrecision("valor_venda_total_liquido").notNull(), // valor total do produto na venda (com desconto) (quantidade * valorUnitario - valorTotalDesconto)
		valorCustoTotal: doublePrecision("valor_custo_total").notNull(), // valor total de custos,
		metadados: jsonb("metadados"), // metadados do produto (JSONB)
	},
	(table) => ({
		vendaIdIdx: index("idx_sale_items_venda_id").on(table.vendaId),
		produtoIdIdx: index("idx_sale_items_produto_id").on(table.produtoId),
		clienteIdIdx: index("idx_sale_items_cliente_id").on(table.clienteId),
		valoresIdx: index("idx_sale_items_valores").on(table.valorVendaTotalLiquido, table.valorCustoTotal),
	}),
);
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
