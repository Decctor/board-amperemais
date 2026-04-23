import { relations } from "drizzle-orm";
import { boolean, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import {
	fiscalClientTaxIndicatorEnum,
	fiscalDocumentEnvironmentEnum,
	fiscalDocumentEventTypeEnum,
	fiscalDocumentTypeEnum,
	fiscalOperationConsumerPresenceEnum,
	fiscalOperationFinalityEnum,
	fiscalProductOriginEnum,
} from "./enums";
import { fiscalDocuments } from "./financial";
import { organizations } from "./organizations";
import { products, productVariants } from "./products";
import { users } from "./users";

export const fiscalDocumentEvents = newTable(
	"fiscal_document_events",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		documentoFiscalId: varchar("documento_fiscal_id", { length: 255 })
			.references(() => fiscalDocuments.id, { onDelete: "cascade" })
			.notNull(),
		tipo: fiscalDocumentEventTypeEnum("tipo").notNull(),
		descricao: text("descricao"),
		payload: text("payload"),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		documentoFiscalIdIdx: index("idx_fiscal_document_events_documento_fiscal_id").on(table.documentoFiscalId),
		tipoIdx: index("idx_fiscal_document_events_tipo").on(table.tipo),
	}),
);

export const fiscalSeries = newTable(
	"fiscal_series",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		tipoDocumento: fiscalDocumentTypeEnum("tipo_documento").notNull(),
		ambiente: fiscalDocumentEnvironmentEnum("ambiente").notNull().default("HOMOLOGACAO"),
		serie: varchar("serie", { length: 20 }).notNull(),
		proximoNumero: integer("proximo_numero").notNull().default(1),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_fiscal_series_organizacao_id").on(table.organizacaoId),
		organizacaoSerieIdx: index("idx_fiscal_series_organizacao_serie").on(table.organizacaoId, table.tipoDocumento, table.ambiente, table.serie),
	}),
);

export const fiscalOperationProfiles = newTable(
	"fiscal_operation_profiles",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		nome: varchar("nome", { length: 255 }).notNull(),
		descricao: text("descricao"),
		tipoDocumento: fiscalDocumentTypeEnum("tipo_documento").notNull(),
		finalidade: fiscalOperationFinalityEnum("finalidade").notNull().default("NORMAL"),
		presencaConsumidor: fiscalOperationConsumerPresenceEnum("presenca_consumidor").notNull().default("OPERACAO_PRESENCIAL"),
		consumidorFinal: boolean("consumidor_final").notNull().default(true),
		cfopPadrao: varchar("cfop_padrao", { length: 10 }).notNull(),
		naturezaOperacao: varchar("natureza_operacao", { length: 255 }).notNull(),
		seriePadraoId: varchar("serie_padrao_id", { length: 255 }).references(() => fiscalSeries.id, { onDelete: "set null" }),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_fiscal_operation_profiles_organizacao_id").on(table.organizacaoId),
		nomeIdx: index("idx_fiscal_operation_profiles_nome").on(table.organizacaoId, table.nome),
	}),
);

export const productFiscalProfiles = newTable(
	"product_fiscal_profiles",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		produtoId: varchar("produto_id", { length: 255 })
			.references(() => products.id, { onDelete: "cascade" })
			.notNull(),
		produtoVarianteId: varchar("produto_variante_id", { length: 255 }).references(() => productVariants.id, { onDelete: "cascade" }),
		origemMercadoria: fiscalProductOriginEnum("origem_mercadoria").notNull().default("NACIONAL"),
		ncm: varchar("ncm", { length: 20 }).notNull(),
		cest: varchar("cest", { length: 20 }),
		cfopPadrao: varchar("cfop_padrao", { length: 10 }),
		unidadeComercial: varchar("unidade_comercial", { length: 10 }).notNull().default("UN"),
		codigoBeneficioFiscal: varchar("codigo_beneficio_fiscal", { length: 30 }),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_product_fiscal_profiles_organizacao_id").on(table.organizacaoId),
		produtoIdIdx: index("idx_product_fiscal_profiles_produto_id").on(table.produtoId),
	}),
);

export const fiscalDocumentEventsRelations = relations(fiscalDocumentEvents, ({ one }) => ({
	documentoFiscal: one(fiscalDocuments, {
		fields: [fiscalDocumentEvents.documentoFiscalId],
		references: [fiscalDocuments.id],
	}),
	autor: one(users, {
		fields: [fiscalDocumentEvents.autorId],
		references: [users.id],
	}),
}));

export const fiscalSeriesRelations = relations(fiscalSeries, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [fiscalSeries.organizacaoId],
		references: [organizations.id],
	}),
	operacoes: many(fiscalOperationProfiles),
}));

export const fiscalOperationProfilesRelations = relations(fiscalOperationProfiles, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [fiscalOperationProfiles.organizacaoId],
		references: [organizations.id],
	}),
	seriePadrao: one(fiscalSeries, {
		fields: [fiscalOperationProfiles.seriePadraoId],
		references: [fiscalSeries.id],
	}),
}));

export const productFiscalProfilesRelations = relations(productFiscalProfiles, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [productFiscalProfiles.organizacaoId],
		references: [organizations.id],
	}),
	produto: one(products, {
		fields: [productFiscalProfiles.produtoId],
		references: [products.id],
	}),
	produtoVariante: one(productVariants, {
		fields: [productFiscalProfiles.produtoVarianteId],
		references: [productVariants.id],
	}),
}));

export type TFiscalDocumentEvent = typeof fiscalDocumentEvents.$inferSelect;
export type TNewFiscalDocumentEvent = typeof fiscalDocumentEvents.$inferInsert;
export type TFiscalSeriesEntity = typeof fiscalSeries.$inferSelect;
export type TNewFiscalSeriesEntity = typeof fiscalSeries.$inferInsert;
export type TFiscalOperationProfileEntity = typeof fiscalOperationProfiles.$inferSelect;
export type TNewFiscalOperationProfileEntity = typeof fiscalOperationProfiles.$inferInsert;
export type TProductFiscalProfileEntity = typeof productFiscalProfiles.$inferSelect;
export type TNewProductFiscalProfileEntity = typeof productFiscalProfiles.$inferInsert;
