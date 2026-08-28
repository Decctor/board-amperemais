import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { salesChannelCatalogModeEnum, salesChannelTypeEnum } from "./enums";
import { integrations } from "./integrations";
import { organizations } from "./organizations";
import { products, productVariants } from "./products";

// ATENÇÃO: os dois uniques abaixo são criados como NULLS NOT DISTINCT em
// drizzle/0082_product_sales_channels.sql — sem isso, canais internos (integracao_id/ref_externo
// nulos) e linhas de nível produto (produto_variante_id nulo) duplicariam, porque o Postgres
// trata cada NULL como distinto. Esta versão do drizzle-orm não expressa NULLS NOT DISTINCT no
// schema, então um `drizzle-kit generate` que toque nesses índices vai propor recriá-los SEM a
// cláusula: revise o SQL gerado antes de aplicar.

export const salesChannels = newTable(
	"sales_channels",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		canal: salesChannelTypeEnum("canal").notNull(),
		integracaoId: varchar("integracao_id", { length: 255 }).references(() => integrations.id, { onDelete: "cascade" }),
		refExterno: varchar("ref_externo", { length: 255 }),
		catalogoModo: salesChannelCatalogModeEnum("catalogo_modo").default("TODOS").notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => ({
		identityUnique: uniqueIndex("unq_sales_channels_identity").on(table.organizacaoId, table.canal, table.integracaoId, table.refExterno),
		organizacaoIdx: index("idx_sales_channels_organizacao").on(table.organizacaoId),
	}),
);

export const productChannelSettings = newTable(
	"product_channel_settings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		canalVendaId: varchar("canal_venda_id", { length: 255 })
			.notNull()
			.references(() => salesChannels.id, { onDelete: "cascade" }),
		produtoId: varchar("produto_id", { length: 255 })
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		produtoVarianteId: varchar("produto_variante_id", { length: 255 }).references(() => productVariants.id, { onDelete: "cascade" }),
		disponivel: boolean("disponivel"),
		precoVenda: doublePrecision("preco_venda"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => ({
		nodeUnique: uniqueIndex("unq_product_channel_settings_node").on(table.canalVendaId, table.produtoId, table.produtoVarianteId),
		canalIdx: index("idx_product_channel_settings_canal").on(table.canalVendaId),
		produtoIdx: index("idx_product_channel_settings_org_produto").on(table.organizacaoId, table.produtoId),
	}),
);

export const salesChannelsRelations = relations(salesChannels, ({ many, one }) => ({
	organizacao: one(organizations, { fields: [salesChannels.organizacaoId], references: [organizations.id] }),
	integracao: one(integrations, { fields: [salesChannels.integracaoId], references: [integrations.id] }),
	configuracoesProdutos: many(productChannelSettings),
}));
export const productChannelSettingsRelations = relations(productChannelSettings, ({ one }) => ({
	canalVenda: one(salesChannels, { fields: [productChannelSettings.canalVendaId], references: [salesChannels.id] }),
	produto: one(products, { fields: [productChannelSettings.produtoId], references: [products.id] }),
	produtoVariante: one(productVariants, { fields: [productChannelSettings.produtoVarianteId], references: [productVariants.id] }),
}));

export type TSalesChannelEntity = typeof salesChannels.$inferSelect;
export type TProductChannelSettingEntity = typeof productChannelSettings.$inferSelect;
