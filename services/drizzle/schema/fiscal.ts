import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import {
	fiscalClientTaxIndicatorEnum,
	fiscalDocumentEnvironmentEnum,
	fiscalDocumentEventTypeEnum,
	fiscalDocumentTypeEnum,
	fiscalIcmsCsosnEnum,
	fiscalInboundManifestEventEnum,
	fiscalOperationConsumerPresenceEnum,
	fiscalOperationFinalityEnum,
	fiscalPisCofinsCstEnum,
	fiscalProductOriginEnum,
	fiscalTaxRuleScopeEnum,
} from "./enums";
import { fiscalOutboundDocuments } from "./financial";
import { organizations } from "./organizations";
import { products, productVariants } from "./products";
import { purchases } from "./purchases";
import { suppliers } from "./suppliers";
import { users } from "./users";

export const fiscalDocumentEvents = newTable(
	"fiscal_document_events",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		documentoFiscalId: varchar("documento_fiscal_id", { length: 255 })
			.references(() => fiscalOutboundDocuments.id, { onDelete: "cascade" })
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

export const fiscalTaxGroups = newTable(
	"fiscal_tax_groups",
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
		// ICMS (Simples Nacional) - defaults intraestaduais
		csosn: fiscalIcmsCsosnEnum("csosn").notNull().default("102"),
		aliquotaIcms: doublePrecision("aliquota_icms").notNull().default(0),
		percentualReducaoBc: doublePrecision("percentual_reducao_bc").notNull().default(0),
		modalidadeBc: integer("modalidade_bc").notNull().default(3),
		// Credito de ICMS no Simples Nacional (CSOSN 101/201)
		percentualCreditoSn: doublePrecision("percentual_credito_sn"),
		// ICMS-ST (configuracao manual nesta fase)
		temSubstituicaoTributaria: boolean("tem_substituicao_tributaria").notNull().default(false),
		mvaSt: doublePrecision("mva_st"),
		aliquotaIcmsSt: doublePrecision("aliquota_icms_st"),
		aliquotaInternaDestino: doublePrecision("aliquota_interna_destino"),
		percentualReducaoBcSt: doublePrecision("percentual_reducao_bc_st"),
		// FCP (Fundo de Combate a Pobreza)
		aliquotaFcp: doublePrecision("aliquota_fcp").notNull().default(0),
		aliquotaFcpSt: doublePrecision("aliquota_fcp_st").notNull().default(0),
		// PIS / COFINS (no SN normalmente CST 49 com valor zero)
		cstPis: fiscalPisCofinsCstEnum("cst_pis").notNull().default("49"),
		aliquotaPis: doublePrecision("aliquota_pis").notNull().default(0),
		cstCofins: fiscalPisCofinsCstEnum("cst_cofins").notNull().default("49"),
		aliquotaCofins: doublePrecision("aliquota_cofins").notNull().default(0),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_fiscal_tax_groups_organizacao_id").on(table.organizacaoId),
		nomeIdx: index("idx_fiscal_tax_groups_nome").on(table.organizacaoId, table.nome),
	}),
);

export const fiscalTaxGroupRules = newTable(
	"fiscal_tax_group_rules",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		grupoTributarioId: varchar("grupo_tributario_id", { length: 255 })
			.references(() => fiscalTaxGroups.id, { onDelete: "cascade" })
			.notNull(),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Dimensoes do cenario. Colunas anulaveis = "aplica-se a qualquer".
		escopo: fiscalTaxRuleScopeEnum("escopo").notNull(),
		ufDestino: varchar("uf_destino", { length: 2 }),
		indicadorDestinatario: fiscalClientTaxIndicatorEnum("indicador_destinatario"),
		finalidade: fiscalOperationFinalityEnum("finalidade"),
		// Overrides (anulaveis = mantem o default do grupo)
		csosn: fiscalIcmsCsosnEnum("csosn"),
		cfop: varchar("cfop", { length: 10 }),
		aliquotaIcms: doublePrecision("aliquota_icms"),
		percentualReducaoBc: doublePrecision("percentual_reducao_bc"),
		percentualCreditoSn: doublePrecision("percentual_credito_sn"),
		temSubstituicaoTributaria: boolean("tem_substituicao_tributaria"),
		mvaSt: doublePrecision("mva_st"),
		aliquotaIcmsSt: doublePrecision("aliquota_icms_st"),
		aliquotaInternaDestino: doublePrecision("aliquota_interna_destino"),
		percentualReducaoBcSt: doublePrecision("percentual_reducao_bc_st"),
		aliquotaFcp: doublePrecision("aliquota_fcp"),
		aliquotaFcpSt: doublePrecision("aliquota_fcp_st"),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		grupoTributarioIdIdx: index("idx_fiscal_tax_group_rules_grupo_tributario_id").on(table.grupoTributarioId),
		cenarioIdx: index("idx_fiscal_tax_group_rules_cenario").on(table.grupoTributarioId, table.escopo, table.ufDestino),
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
		grupoTributarioId: varchar("grupo_tributario_id", { length: 255 }).references(() => fiscalTaxGroups.id, { onDelete: "set null" }),
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

// Tabela IBPT (Lei 12.741) — dado de referencia GLOBAL (sem organizacaoId), por NCM e UF.
// Usada para preencher o vTotTrib (valor aproximado dos tributos) dos itens.
export const fiscalIbptRates = newTable(
	"fiscal_ibpt_rates",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		ncm: varchar("ncm", { length: 20 }).notNull(),
		uf: varchar("uf", { length: 2 }).notNull(),
		exTipi: varchar("ex_tipi", { length: 10 }),
		descricao: text("descricao"),
		aliqNacionalFederal: doublePrecision("aliq_nacional_federal").notNull().default(0),
		aliqImportadosFederal: doublePrecision("aliq_importados_federal").notNull().default(0),
		aliqEstadual: doublePrecision("aliq_estadual").notNull().default(0),
		aliqMunicipal: doublePrecision("aliq_municipal").notNull().default(0),
		versao: varchar("versao", { length: 20 }),
		vigenciaInicio: timestamp("vigencia_inicio"),
		vigenciaFim: timestamp("vigencia_fim"),
		chave: varchar("chave", { length: 20 }),
		fonte: varchar("fonte", { length: 50 }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		ncmUfIdx: index("idx_fiscal_ibpt_rates_ncm_uf").on(table.ncm, table.uf),
	}),
);

export const fiscalDocumentEventsRelations = relations(fiscalDocumentEvents, ({ one }) => ({
	documentoFiscal: one(fiscalOutboundDocuments, {
		fields: [fiscalDocumentEvents.documentoFiscalId],
		references: [fiscalOutboundDocuments.id],
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
	grupoTributario: one(fiscalTaxGroups, {
		fields: [productFiscalProfiles.grupoTributarioId],
		references: [fiscalTaxGroups.id],
	}),
}));

export const fiscalTaxGroupsRelations = relations(fiscalTaxGroups, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [fiscalTaxGroups.organizacaoId],
		references: [organizations.id],
	}),
	regras: many(fiscalTaxGroupRules),
	perfisProdutos: many(productFiscalProfiles),
}));

export const fiscalTaxGroupRulesRelations = relations(fiscalTaxGroupRules, ({ one }) => ({
	grupoTributario: one(fiscalTaxGroups, {
		fields: [fiscalTaxGroupRules.grupoTributarioId],
		references: [fiscalTaxGroups.id],
	}),
	organizacao: one(organizations, {
		fields: [fiscalTaxGroupRules.organizacaoId],
		references: [organizations.id],
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
export type TFiscalTaxGroupEntity = typeof fiscalTaxGroups.$inferSelect;
export type TNewFiscalTaxGroupEntity = typeof fiscalTaxGroups.$inferInsert;
export type TFiscalTaxGroupRuleEntity = typeof fiscalTaxGroupRules.$inferSelect;
export type TNewFiscalTaxGroupRuleEntity = typeof fiscalTaxGroupRules.$inferInsert;
export type TFiscalIbptRateEntity = typeof fiscalIbptRates.$inferSelect;
export type TNewFiscalIbptRateEntity = typeof fiscalIbptRates.$inferInsert;

// ============================================================================
// DF-e (notas recebidas / inbound) — distribuicao e manifestacao do destinatario
// ============================================================================

export const fiscalInboundDocuments = newTable(
	"fiscal_inbound_documents",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		fornecedorId: varchar("fornecedor_id", { length: 255 }).references(() => suppliers.id, { onDelete: "set null" }),
		chaveAcesso: varchar("chave_acesso", { length: 44 }).notNull(),
		nsu: varchar("nsu", { length: 30 }).notNull(),
		completo: boolean("completo").notNull().default(false),
		emitenteCnpj: varchar("emitente_cnpj", { length: 20 }),
		emitenteNome: varchar("emitente_nome", { length: 255 }),
		valorTotal: doublePrecision("valor_total"),
		dataEmissao: timestamp("data_emissao"),
		situacao: varchar("situacao", { length: 30 }),
		manifestacaoAtual: fiscalInboundManifestEventEnum("manifestacao_atual"),
		xmlStoragePath: varchar("xml_storage_path", { length: 500 }),
		resumoPayload: text("resumo_payload"),
		compraId: varchar("compra_id", { length: 255 }).references(() => purchases.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_fiscal_inbound_documents_organizacao_id").on(table.organizacaoId),
		chaveAcessoIdx: index("idx_fiscal_inbound_documents_chave").on(table.organizacaoId, table.chaveAcesso),
		nsuIdx: index("idx_fiscal_inbound_documents_nsu").on(table.organizacaoId, table.nsu),
	}),
);

export const fiscalInboundCursors = newTable(
	"fiscal_inbound_cursors",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		ultNSU: varchar("ult_nsu", { length: 30 }).notNull().default("0"),
		maxNSU: varchar("max_nsu", { length: 30 }).notNull().default("0"),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_fiscal_inbound_cursors_organizacao_id").on(table.organizacaoId),
	}),
);

export const fiscalInboundDocumentsRelations = relations(fiscalInboundDocuments, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [fiscalInboundDocuments.organizacaoId],
		references: [organizations.id],
	}),
	fornecedor: one(suppliers, {
		fields: [fiscalInboundDocuments.fornecedorId],
		references: [suppliers.id],
	}),
	compra: one(purchases, {
		fields: [fiscalInboundDocuments.compraId],
		references: [purchases.id],
	}),
}));

export const fiscalInboundCursorsRelations = relations(fiscalInboundCursors, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [fiscalInboundCursors.organizacaoId],
		references: [organizations.id],
	}),
}));

export type TFiscalInboundDocumentEntity = typeof fiscalInboundDocuments.$inferSelect;
export type TNewFiscalInboundDocumentEntity = typeof fiscalInboundDocuments.$inferInsert;
export type TFiscalInboundCursorEntity = typeof fiscalInboundCursors.$inferSelect;
export type TNewFiscalInboundCursorEntity = typeof fiscalInboundCursors.$inferInsert;
