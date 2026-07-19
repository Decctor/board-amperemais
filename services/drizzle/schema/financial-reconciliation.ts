import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import {
	financialOpenFinanceConnectionStatusEnum,
	financialReconciliationActionEnum,
	financialReconciliationMatchStatusEnum,
	financialReconciliationMatchTypeEnum,
	financialStatementImportStatusEnum,
	financialStatementOriginEnum,
	financialStatementTransactionStatusEnum,
	financialTransactionTypeEnum,
	paymentMethodEnum,
} from "./enums";
import { accountsCharts, financialAccounts, financialTransactions } from "./financial";
import { organizations } from "./organizations";
import { users } from "./users";

// ============================================================================
// OPENFINANCE CONNECTIONS (Conexões com agregadores — Fase 4)
// ============================================================================

export const financialOpenFinanceConnections = newTable(
	"financial_openfinance_connections",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		contaFinanceiraId: varchar("conta_financeira_id", { length: 255 })
			.references(() => financialAccounts.id, { onDelete: "cascade" })
			.notNull(),
		// Varchar de propósito (não pgEnum): novos agregadores não custam migração de enum.
		provedor: varchar("provedor", { length: 50 }).notNull(),
		status: financialOpenFinanceConnectionStatusEnum("status").notNull().default("CONECTADO"),
		ativo: boolean("ativo").default(true).notNull(),
		// Identificadores no agregador (item/conexão e conta bancária dentro do item).
		provedorItemId: varchar("provedor_item_id", { length: 255 }),
		provedorContaId: varchar("provedor_conta_id", { length: 255 }),
		provedorMetadados: jsonb("provedor_metadados"),
		erro: text("erro"),
		ultimaSincronizacao: timestamp("ultima_sincronizacao"),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		atualizadoEm: timestamp("atualizado_em").$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_financial_of_connections_organizacao_id").on(table.organizacaoId),
		contaFinanceiraIdx: index("idx_financial_of_connections_conta").on(table.contaFinanceiraId),
		// Uma conexão por conta bancária do agregador por organização.
		provedorContaUq: uniqueIndex("uq_financial_of_connections_provedor_conta").on(table.organizacaoId, table.provedor, table.provedorContaId),
	}),
);

export const financialOpenFinanceConnectionsRelations = relations(financialOpenFinanceConnections, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [financialOpenFinanceConnections.organizacaoId],
		references: [organizations.id],
	}),
	contaFinanceira: one(financialAccounts, {
		fields: [financialOpenFinanceConnections.contaFinanceiraId],
		references: [financialAccounts.id],
	}),
	autor: one(users, {
		fields: [financialOpenFinanceConnections.autorId],
		references: [users.id],
	}),
	importacoes: many(financialStatementImports),
}));

export type TFinancialOpenFinanceConnection = typeof financialOpenFinanceConnections.$inferSelect;
export type TNewFinancialOpenFinanceConnection = typeof financialOpenFinanceConnections.$inferInsert;

// ============================================================================
// STATEMENT IMPORTS (Importações de Extrato)
// ============================================================================

export const financialStatementImports = newTable(
	"financial_statement_imports",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		contaFinanceiraId: varchar("conta_financeira_id", { length: 255 })
			.references(() => financialAccounts.id, { onDelete: "cascade" })
			.notNull(),
		origem: financialStatementOriginEnum("origem").notNull().default("ARQUIVO"),
		conexaoId: varchar("conexao_id", { length: 255 }).references(() => financialOpenFinanceConnections.id, { onDelete: "set null" }),
		status: financialStatementImportStatusEnum("status").notNull().default("PROCESSANDO"),
		erro: text("erro"),
		// Arquivo de origem (null para importações OPEN_FINANCE).
		arquivoNome: varchar("arquivo_nome", { length: 500 }),
		arquivoStoragePath: text("arquivo_storage_path"),
		arquivoMimeType: varchar("arquivo_mime_type", { length: 100 }),
		arquivoTamanhoBytes: integer("arquivo_tamanho_bytes"),
		// Detectados do extrato (validação de sanidade da extração).
		periodoInicio: timestamp("periodo_inicio"),
		periodoFim: timestamp("periodo_fim"),
		saldoInicial: doublePrecision("saldo_inicial"),
		saldoFinal: doublePrecision("saldo_final"),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_financial_statement_imports_organizacao_id").on(table.organizacaoId),
		contaFinanceiraIdx: index("idx_financial_statement_imports_conta").on(table.contaFinanceiraId),
		statusIdx: index("idx_financial_statement_imports_status").on(table.status),
	}),
);

export const financialStatementImportsRelations = relations(financialStatementImports, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [financialStatementImports.organizacaoId],
		references: [organizations.id],
	}),
	contaFinanceira: one(financialAccounts, {
		fields: [financialStatementImports.contaFinanceiraId],
		references: [financialAccounts.id],
	}),
	conexao: one(financialOpenFinanceConnections, {
		fields: [financialStatementImports.conexaoId],
		references: [financialOpenFinanceConnections.id],
	}),
	autor: one(users, {
		fields: [financialStatementImports.autorId],
		references: [users.id],
	}),
	transacoes: many(financialStatementTransactions),
}));

export type TFinancialStatementImport = typeof financialStatementImports.$inferSelect;
export type TNewFinancialStatementImport = typeof financialStatementImports.$inferInsert;

// ============================================================================
// STATEMENT TRANSACTIONS (Linhas do Extrato)
// ============================================================================

export const financialStatementTransactions = newTable(
	"financial_statement_transactions",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		importacaoId: varchar("importacao_id", { length: 255 })
			.references(() => financialStatementImports.id, { onDelete: "cascade" })
			.notNull(),
		// Denormalizado da importação para filtros diretos por conta.
		contaFinanceiraId: varchar("conta_financeira_id", { length: 255 })
			.references(() => financialAccounts.id, { onDelete: "cascade" })
			.notNull(),
		dataTransacao: timestamp("data_transacao").notNull(),
		descricao: text("descricao").notNull(),
		tipo: financialTransactionTypeEnum("tipo").notNull(),
		valor: doublePrecision("valor").notNull(),
		metodo: paymentMethodEnum("metodo"),
		// FITID do OFX / id do agregador OpenFinance — chave de idempotência primária.
		idExterno: varchar("id_externo", { length: 255 }),
		// sha256(conta, dia, valor, tipo, descrição normalizada) — idempotência quando não há idExterno.
		hash: varchar("hash", { length: 64 }).notNull(),
		status: financialStatementTransactionStatusEnum("status").notNull().default("PENDENTE"),
		// Linha crua do parser (debug/auditoria).
		metadados: jsonb("metadados"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_financial_statement_transactions_organizacao_id").on(table.organizacaoId),
		importacaoIdx: index("idx_financial_statement_transactions_importacao").on(table.importacaoId),
		contaStatusIdx: index("idx_financial_statement_transactions_conta_status").on(table.contaFinanceiraId, table.status),
		dataTransacaoIdx: index("idx_financial_statement_transactions_data").on(table.dataTransacao),
		// NULLs não colidem: linhas sem idExterno dependem só do hash.
		idExternoUq: uniqueIndex("uq_financial_statement_transactions_id_externo").on(table.contaFinanceiraId, table.idExterno),
		hashUq: uniqueIndex("uq_financial_statement_transactions_hash").on(table.contaFinanceiraId, table.hash),
	}),
);

export const financialStatementTransactionsRelations = relations(financialStatementTransactions, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [financialStatementTransactions.organizacaoId],
		references: [organizations.id],
	}),
	importacao: one(financialStatementImports, {
		fields: [financialStatementTransactions.importacaoId],
		references: [financialStatementImports.id],
	}),
	contaFinanceira: one(financialAccounts, {
		fields: [financialStatementTransactions.contaFinanceiraId],
		references: [financialAccounts.id],
	}),
	matches: many(financialReconciliationMatches),
}));

export type TFinancialStatementTransaction = typeof financialStatementTransactions.$inferSelect;
export type TNewFinancialStatementTransaction = typeof financialStatementTransactions.$inferInsert;

// ============================================================================
// RECONCILIATION MATCHES (Vínculos linha do extrato ↔ transação financeira)
// ============================================================================

export const financialReconciliationMatches = newTable(
	"financial_reconciliation_matches",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		extratoTransacaoId: varchar("extrato_transacao_id", { length: 255 })
			.references(() => financialStatementTransactions.id, { onDelete: "cascade" })
			.notNull(),
		transacaoFinanceiraId: varchar("transacao_financeira_id", { length: 255 })
			.references(() => financialTransactions.id, { onDelete: "cascade" })
			.notNull(),
		tipo: financialReconciliationMatchTypeEnum("tipo").notNull(),
		confianca: doublePrecision("confianca"),
		status: financialReconciliationMatchStatusEnum("status").notNull().default("SUGERIDO"),
		acao: financialReconciliationActionEnum("acao"),
		// null para sugestões geradas automaticamente pelo motor de matching.
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_financial_reconciliation_matches_organizacao_id").on(table.organizacaoId),
		extratoTransacaoIdx: index("idx_financial_reconciliation_matches_extrato").on(table.extratoTransacaoId),
		transacaoFinanceiraIdx: index("idx_financial_reconciliation_matches_transacao").on(table.transacaoFinanceiraId),
		statusIdx: index("idx_financial_reconciliation_matches_status").on(table.status),
		parUq: uniqueIndex("uq_financial_reconciliation_matches_par").on(table.extratoTransacaoId, table.transacaoFinanceiraId),
	}),
);

export const financialReconciliationMatchesRelations = relations(financialReconciliationMatches, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [financialReconciliationMatches.organizacaoId],
		references: [organizations.id],
	}),
	extratoTransacao: one(financialStatementTransactions, {
		fields: [financialReconciliationMatches.extratoTransacaoId],
		references: [financialStatementTransactions.id],
	}),
	transacaoFinanceira: one(financialTransactions, {
		fields: [financialReconciliationMatches.transacaoFinanceiraId],
		references: [financialTransactions.id],
	}),
	autor: one(users, {
		fields: [financialReconciliationMatches.autorId],
		references: [users.id],
	}),
}));

export type TFinancialReconciliationMatch = typeof financialReconciliationMatches.$inferSelect;
export type TNewFinancialReconciliationMatch = typeof financialReconciliationMatches.$inferInsert;

// ============================================================================
// RECONCILIATION RULES (Regras aprendidas: descrição → contas contábeis)
// ============================================================================

export const financialReconciliationRules = newTable(
	"financial_reconciliation_rules",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Descrição normalizada (sem acentos/números variáveis) que identifica linhas semelhantes.
		padraoDescricao: varchar("padrao_descricao", { length: 500 }).notNull(),
		tipo: financialTransactionTypeEnum("tipo").notNull(),
		contaContabilDebitoId: varchar("conta_contabil_debito_id", { length: 255 })
			.references(() => accountsCharts.id, { onDelete: "cascade" })
			.notNull(),
		contaContabilCreditoId: varchar("conta_contabil_credito_id", { length: 255 })
			.references(() => accountsCharts.id, { onDelete: "cascade" })
			.notNull(),
		metodo: paymentMethodEnum("metodo"),
		// Contagem de usos confirmados — desempate quando mais de uma regra casa.
		usos: integer("usos").default(1).notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		atualizadoEm: timestamp("atualizado_em").$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_financial_reconciliation_rules_organizacao_id").on(table.organizacaoId),
		padraoUq: uniqueIndex("uq_financial_reconciliation_rules_padrao").on(table.organizacaoId, table.padraoDescricao, table.tipo),
	}),
);

export const financialReconciliationRulesRelations = relations(financialReconciliationRules, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [financialReconciliationRules.organizacaoId],
		references: [organizations.id],
	}),
	contaContabilDebito: one(accountsCharts, {
		fields: [financialReconciliationRules.contaContabilDebitoId],
		references: [accountsCharts.id],
		relationName: "regra-conta-debito",
	}),
	contaContabilCredito: one(accountsCharts, {
		fields: [financialReconciliationRules.contaContabilCreditoId],
		references: [accountsCharts.id],
		relationName: "regra-conta-credito",
	}),
}));

export type TFinancialReconciliationRule = typeof financialReconciliationRules.$inferSelect;
export type TNewFinancialReconciliationRule = typeof financialReconciliationRules.$inferInsert;
