import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { stockPositionImportOriginEnum, stockPositionImportStatusEnum } from "./enums";
import { organizations } from "./organizations";
import { products, productVariants } from "./products";
import { suppliers } from "./suppliers";
import { users } from "./users";

// -----------------------------------------------------------------------------
// POLÍTICA DE REPOSIÇÃO DA ORGANIZAÇÃO
// -----------------------------------------------------------------------------
// Uma linha por organização. Guarda os parâmetros que a compradora ajusta uma vez e que passam a
// valer para todo o catálogo: janela de análise da demanda, prazo de entrega padrão, nível de
// serviço (que vira o Z do estoque de segurança) e os limiares que classificam ruptura e excesso.
export const replenishmentSettings = newTable(
	"replenishment_settings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Janela de histórico de vendas usada para estimar a demanda diária.
		janelaAnaliseDias: integer("janela_analise_dias").default(90).notNull(),
		// Prazo médio entre o pedido e o recebimento quando o fornecedor não tem histórico próprio.
		leadTimeDiasPadrao: integer("lead_time_dias_padrao").default(15).notNull(),
		// Intervalo entre duas rodadas de compra: o pedido precisa cobrir o lead time E o próximo ciclo.
		cicloRevisaoDias: integer("ciclo_revisao_dias").default(15).notNull(),
		// Cobertura desejada depois do recebimento — define o "até onde encher" da sugestão.
		diasCoberturaAlvo: integer("dias_cobertura_alvo").default(30).notNull(),
		// Probabilidade de não faltar dentro do lead time (0.80 a 0.99). Vira o Z do estoque de segurança.
		nivelServico: doublePrecision("nivel_servico").default(0.95).notNull(),
		// Acima desta cobertura o item entra na lista de excesso (candidato a oferta).
		diasExcessoLimite: integer("dias_excesso_limite").default(30).notNull(),
		// Desconta da janela os dias em que o produto esteve zerado, evitando subestimar a demanda
		// de justamente quem mais faltou. Consulte docs/replenishment-planning-design.md §3.
		ajustarDemandaPorRuptura: boolean("ajustar_demanda_por_ruptura").default(true).notNull(),
		// Fonte do saldo: SISTEMA usa products.quantidade; IMPORTACAO usa o último snapshot enviado.
		origemEstoquePadrao: varchar("origem_estoque_padrao", { length: 20 }).default("SISTEMA").notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
	},
	(table) => ({
		organizacaoUnq: uniqueIndex("unq_replenishment_settings_organizacao").on(table.organizacaoId),
	}),
);

export const replenishmentSettingsRelations = relations(replenishmentSettings, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [replenishmentSettings.organizacaoId],
		references: [organizations.id],
	}),
}));

export type TReplenishmentSettingsEntity = typeof replenishmentSettings.$inferSelect;
export type TNewReplenishmentSettingsEntity = typeof replenishmentSettings.$inferInsert;

// -----------------------------------------------------------------------------
// POLÍTICA DE REPOSIÇÃO DO PRODUTO
// -----------------------------------------------------------------------------
// Linha esparsa: só existe para os produtos que fogem da política da organização. `sobressalente`
// é o que separa o item de giro lento por escolha (peça de reposição, item de garantia) do item
// parado por erro de compra — o primeiro nunca deve virar oferta nem alarme de excesso.
export const productReplenishmentSettings = newTable(
	"product_replenishment_settings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		produtoId: varchar("produto_id", { length: 255 })
			.references(() => products.id, { onDelete: "cascade" })
			.notNull(),
		produtoVarianteId: varchar("produto_variante_id", { length: 255 }).references(() => productVariants.id, { onDelete: "cascade" }),
		// Item mantido de propósito com giro baixo. Fica fora do excesso e das sugestões de oferta.
		sobressalente: boolean("sobressalente").default(false).notNull(),
		// Item que não deve entrar em promoção mesmo quando o excesso é real (contrato, preço tabelado).
		naoPromover: boolean("nao_promover").default(false).notNull(),
		// Fora de linha: não sugerir recompra, mesmo em ruptura.
		descontinuado: boolean("descontinuado").default(false).notNull(),
		fornecedorPreferencialId: varchar("fornecedor_preferencial_id", { length: 255 }).references(() => suppliers.id, { onDelete: "set null" }),
		leadTimeDias: integer("lead_time_dias"),
		// Embalagem de compra: a sugestão é arredondada para cima em múltiplos deste valor.
		multiploCompra: doublePrecision("multiplo_compra"),
		quantidadeMinimaCompra: doublePrecision("quantidade_minima_compra"),
		estoqueMinimo: doublePrecision("estoque_minimo"),
		estoqueMaximo: doublePrecision("estoque_maximo"),
		anotacoes: text("anotacoes"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
	},
	(table) => ({
		organizacaoIdx: index("idx_product_replenishment_settings_organizacao").on(table.organizacaoId),
		produtoUnq: uniqueIndex("unq_product_replenishment_settings_produto").on(table.produtoId),
	}),
);

export const productReplenishmentSettingsRelations = relations(productReplenishmentSettings, ({ one }) => ({
	produto: one(products, {
		fields: [productReplenishmentSettings.produtoId],
		references: [products.id],
	}),
	produtoVariante: one(productVariants, {
		fields: [productReplenishmentSettings.produtoVarianteId],
		references: [productVariants.id],
	}),
	fornecedorPreferencial: one(suppliers, {
		fields: [productReplenishmentSettings.fornecedorPreferencialId],
		references: [suppliers.id],
	}),
}));

export type TProductReplenishmentSettingsEntity = typeof productReplenishmentSettings.$inferSelect;
export type TNewProductReplenishmentSettingsEntity = typeof productReplenishmentSettings.$inferInsert;

// -----------------------------------------------------------------------------
// POSIÇÃO DE ESTOQUE IMPORTADA
// -----------------------------------------------------------------------------
// Snapshot enviado pela loja quando o ERP externo é a fonte da verdade do saldo. A integração da
// Online Sistemas entrega vendas (logo, demanda e custo), mas não entrega saldo de estoque nem
// compras — sem este snapshot a cobertura seria calculada sobre um saldo que o RecompraCRM não
// mantém. Cada importação é imutável; a análise lê sempre a mais recente concluída.
export const stockPositionImports = newTable(
	"stock_position_imports",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		origem: stockPositionImportOriginEnum("origem").default("PLANILHA").notNull(),
		status: stockPositionImportStatusEnum("status").default("PROCESSANDO").notNull(),
		arquivoNome: text("arquivo_nome"),
		// Data a que a posição se refere — não é a data do upload: a loja pode subir hoje o relatório
		// tirado ontem à noite, e a cobertura precisa saber a idade real do saldo.
		dataPosicao: timestamp("data_posicao").defaultNow().notNull(),
		linhasLidas: integer("linhas_lidas").default(0).notNull(),
		linhasConciliadas: integer("linhas_conciliadas").default(0).notNull(),
		linhasNaoConciliadas: integer("linhas_nao_conciliadas").default(0).notNull(),
		// Mapeamento coluna do arquivo -> campo interno, guardado para repetir o próximo upload.
		mapeamentoColunas: jsonb("mapeamento_colunas"),
		erro: text("erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
	},
	(table) => ({
		organizacaoIdx: index("idx_stock_position_imports_organizacao").on(table.organizacaoId),
		dataPosicaoIdx: index("idx_stock_position_imports_data_posicao").on(table.organizacaoId, table.dataPosicao),
	}),
);

export const stockPositionImportItems = newTable(
	"stock_position_import_items",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		importacaoId: varchar("importacao_id", { length: 255 })
			.references(() => stockPositionImports.id, { onDelete: "cascade" })
			.notNull(),
		// Código lido do arquivo. É a chave de conciliação com products.codigo.
		codigo: text("codigo").notNull(),
		descricao: text("descricao"),
		// Nulo quando a linha não encontrou produto no catálogo — a linha é preservada para o
		// relatório de não conciliados, e não some silenciosamente.
		produtoId: varchar("produto_id", { length: 255 }).references(() => products.id, { onDelete: "set null" }),
		quantidade: doublePrecision("quantidade").notNull(),
		// Colunas opcionais do relatório do ERP: quando presentes, substituem o que calcularíamos.
		custoUnitario: doublePrecision("custo_unitario"),
		precoVenda: doublePrecision("preco_venda"),
		quantidadeEmTransito: doublePrecision("quantidade_em_transito"),
		fornecedorNome: text("fornecedor_nome"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		importacaoIdx: index("idx_stock_position_import_items_importacao").on(table.importacaoId),
		produtoIdx: index("idx_stock_position_import_items_produto").on(table.produtoId),
		codigoIdx: index("idx_stock_position_import_items_codigo").on(table.organizacaoId, table.codigo),
	}),
);

export const stockPositionImportsRelations = relations(stockPositionImports, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [stockPositionImports.organizacaoId],
		references: [organizations.id],
	}),
	itens: many(stockPositionImportItems),
	autor: one(users, {
		fields: [stockPositionImports.autorId],
		references: [users.id],
	}),
}));

export const stockPositionImportItemsRelations = relations(stockPositionImportItems, ({ one }) => ({
	importacao: one(stockPositionImports, {
		fields: [stockPositionImportItems.importacaoId],
		references: [stockPositionImports.id],
	}),
	produto: one(products, {
		fields: [stockPositionImportItems.produtoId],
		references: [products.id],
	}),
}));

export type TStockPositionImportEntity = typeof stockPositionImports.$inferSelect;
export type TNewStockPositionImportEntity = typeof stockPositionImports.$inferInsert;
export type TStockPositionImportItemEntity = typeof stockPositionImportItems.$inferSelect;
export type TNewStockPositionImportItemEntity = typeof stockPositionImportItems.$inferInsert;
