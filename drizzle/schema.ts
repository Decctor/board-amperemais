import { pgTable, index, foreignKey, varchar, doublePrecision, jsonb, text, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const ampmaisSaleItems = pgTable("ampmais_sale_items", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	vendaId: varchar("venda_id", { length: 255 }).notNull(),
	clienteId: varchar("cliente_id", { length: 255 }).notNull(),
	produtoId: varchar("produto_id", { length: 255 }).notNull(),
	quantidade: doublePrecision().notNull(),
	valorUnitario: doublePrecision("valor_unitario").notNull(),
	valorCustoUnitario: doublePrecision("valor_custo_unitario").notNull(),
	valorVendaTotalBruto: doublePrecision("valor_venda_total_bruto").notNull(),
	valorTotalDesconto: doublePrecision("valor_total_desconto").notNull(),
	valorVendaTotalLiquido: doublePrecision("valor_venda_total_liquido").notNull(),
	valorCustoTotal: doublePrecision("valor_custo_total").notNull(),
	metadados: jsonb(),
}, (table) => [
	index("idx_sale_items_cliente_id").using("btree", table.clienteId.asc().nullsLast().op("text_ops")),
	index("idx_sale_items_produto_id").using("btree", table.produtoId.asc().nullsLast().op("text_ops")),
	index("idx_sale_items_valores").using("btree", table.valorVendaTotalLiquido.asc().nullsLast().op("float8_ops"), table.valorCustoTotal.asc().nullsLast().op("float8_ops")),
	index("idx_sale_items_venda_id").using("btree", table.vendaId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [ampmaisClients.id],
			name: "ampmais_sale_items_cliente_id_ampmais_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.produtoId],
			foreignColumns: [ampmaisProducts.id],
			name: "ampmais_sale_items_produto_id_ampmais_products_id_fk"
		}),
	foreignKey({
			columns: [table.vendaId],
			foreignColumns: [ampmaisSales.id],
			name: "ampmais_sale_items_venda_id_ampmais_sales_id_fk"
		}).onDelete("cascade"),
]);

export const ampmaisProducts = pgTable("ampmais_products", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	descricao: text().notNull(),
	codigo: text().notNull(),
	unidade: text().notNull(),
	ncm: text().notNull(),
	tipo: text().notNull(),
	grupo: text().notNull(),
}, (table) => [
	index("idx_products_grupo").using("btree", table.grupo.asc().nullsLast().op("text_ops")),
]);

export const ampmaisSales = pgTable("ampmais_sales", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	clienteId: varchar("cliente_id", { length: 255 }).notNull(),
	idExterno: text("id_externo").notNull(),
	valorTotal: doublePrecision("valor_total").notNull(),
	custoTotal: doublePrecision("custo_total").notNull(),
	vendedor: text().notNull(),
	parceiro: text().notNull(),
	chave: text().notNull(),
	documento: text().notNull(),
	modelo: text().notNull(),
	movimento: text().notNull(),
	natureza: text().notNull(),
	serie: text().notNull(),
	situacao: text().notNull(),
	tipo: text().notNull(),
	dataVenda: timestamp("data_venda", { mode: 'string' }),
}, (table) => [
	index("idx_sales_data_venda").using("btree", table.dataVenda.asc().nullsLast().op("timestamp_ops")),
	index("idx_sales_natureza").using("btree", table.natureza.asc().nullsLast().op("text_ops")),
	index("idx_sales_valor_total").using("btree", table.valorTotal.asc().nullsLast().op("float8_ops")),
	index("idx_sales_vendedor").using("btree", table.vendedor.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clienteId],
			foreignColumns: [ampmaisClients.id],
			name: "ampmais_sales_cliente_id_ampmais_clients_id_fk"
		}),
]);

export const ampmaisClients = pgTable("ampmais_clients", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	nome: text().notNull(),
	telefone: text(),
	email: text(),
	canalAquisicao: text("canal_aquisicao"),
	primeiraCompraData: timestamp("primeira_compra_data", { mode: 'string' }),
	primeiraCompraId: varchar("primeira_compra_id"),
	ultimaCompraData: timestamp("ultima_compra_data", { mode: 'string' }),
	ultimaCompraId: varchar("ultima_compra_id"),
	dataInsercao: timestamp("data_insercao", { mode: 'string' }).defaultNow(),
	analiseRfmTitulo: text("analise_rfm_titulo"),
	analiseRfmNotasRecencia: text("analise_rfm_notas_recencia"),
	analiseRfmNotasFrequencia: text("analise_rfm_notas_frequencia"),
	analiseRfmNotasMonetario: text("analise_rfm_notas_monetario"),
	analiseRfmUltimaAtualizacao: timestamp("analise_rfm_ultima_atualizacao", { mode: 'string' }),
}, (table) => [
	index("idx_clients_nome").using("gin", sql`to_tsvector('portuguese'::regconfig, nome)`),
	index("idx_clients_rfm_titulo").using("btree", table.analiseRfmTitulo.asc().nullsLast().op("text_ops")),
]);
