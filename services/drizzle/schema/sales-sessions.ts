import { relations } from "drizzle-orm";
import { doublePrecision, index, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { paymentMethodEnum, salesSessionStatusEnum } from "./enums";
import { financialAccounts, financialTransactions } from "./financial";
import { organizations } from "./organizations";
import { sales } from "./sales";
import { sellers } from "./sellers";
import { users } from "./users";

// ============================================================================
// SALES SESSIONS (Sessões de Venda / Fechamento de Caixa)
// ============================================================================

export const salesSessions = newTable(
	"sales_sessions",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Conta CAIXA física do turno (nullable p/ progressive disclosure).
		contaFinanceiraId: varchar("conta_financeira_id", { length: 255 }).references(() => financialAccounts.id, { onDelete: "set null" }),
		// O "responsável" pelo turno — base do escopo nesta versão.
		responsavelVendedorId: varchar("responsavel_vendedor_id", { length: 255 }).references(() => sellers.id, { onDelete: "set null" }),
		// Chave de escopo p/ unicidade da sessão aberta (= responsavelVendedorId nesta versão; terminal no futuro).
		escopoChave: text("escopo_chave").notNull(),
		// Auditoria de operadores (usuários autenticados).
		abertaPorUsuarioId: varchar("aberta_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		fechadaPorUsuarioId: varchar("fechada_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		conferidaPorUsuarioId: varchar("conferida_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		status: salesSessionStatusEnum("status").notNull().default("ABERTA"),
		saldoInicial: doublePrecision("saldo_inicial").notNull().default(0),
		dataAbertura: timestamp("data_abertura").defaultNow().notNull(),
		dataFechamento: timestamp("data_fechamento"),
		// Snapshots congelados no fechamento (denormalizados p/ histórico imutável).
		totalEsperado: doublePrecision("total_esperado"),
		totalInformado: doublePrecision("total_informado"),
		diferencaTotal: doublePrecision("diferenca_total"),
		observacoesAbertura: text("observacoes_abertura"),
		observacoesFechamento: text("observacoes_fechamento"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_sales_sessions_organizacao_id").on(table.organizacaoId),
		statusIdx: index("idx_sales_sessions_status").on(table.organizacaoId, table.status),
		responsavelIdx: index("idx_sales_sessions_responsavel").on(table.responsavelVendedorId),
		// Garante no máximo uma sessão ABERTA por escopo. O filtro parcial (WHERE status = 'ABERTA')
		// é aplicado manualmente na migration — drizzle-kit não modela índice parcial.
		abertaUnicaIdx: uniqueIndex("uq_sales_sessions_aberta").on(table.organizacaoId, table.escopoChave),
	}),
);

export const salesSessionsRelations = relations(salesSessions, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [salesSessions.organizacaoId],
		references: [organizations.id],
	}),
	contaFinanceira: one(financialAccounts, {
		fields: [salesSessions.contaFinanceiraId],
		references: [financialAccounts.id],
	}),
	responsavelVendedor: one(sellers, {
		fields: [salesSessions.responsavelVendedorId],
		references: [sellers.id],
	}),
	abertaPorUsuario: one(users, {
		fields: [salesSessions.abertaPorUsuarioId],
		references: [users.id],
		relationName: "sessao-aberta-por",
	}),
	fechadaPorUsuario: one(users, {
		fields: [salesSessions.fechadaPorUsuarioId],
		references: [users.id],
		relationName: "sessao-fechada-por",
	}),
	conferidaPorUsuario: one(users, {
		fields: [salesSessions.conferidaPorUsuarioId],
		references: [users.id],
		relationName: "sessao-conferida-por",
	}),
	conferencias: many(salesSessionReconciliations),
	transacoesFinanceiras: many(financialTransactions),
	vendas: many(sales),
}));

export type TSalesSession = typeof salesSessions.$inferSelect;
export type TNewSalesSession = typeof salesSessions.$inferInsert;

// ============================================================================
// SALES SESSION RECONCILIATIONS (Conferência por método de pagamento)
// ============================================================================

export const salesSessionReconciliations = newTable(
	"sales_session_reconciliations",
	{
		id: varchar("id", { length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		sessaoVendaId: varchar("sessao_venda_id", { length: 255 })
			.references(() => salesSessions.id, { onDelete: "cascade" })
			.notNull(),
		metodo: paymentMethodEnum("metodo").notNull(),
		// Σ financialTransactions do método na sessão (snapshot congelado no fechamento).
		valorEsperado: doublePrecision("valor_esperado").notNull(),
		// Contagem física (nullable — só métodos de gaveta, ex. DINHEIRO, têm contagem).
		valorInformado: doublePrecision("valor_informado"),
		diferenca: doublePrecision("diferenca"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		sessaoIdx: index("idx_sales_session_reconciliations_sessao").on(table.sessaoVendaId),
	}),
);

export const salesSessionReconciliationsRelations = relations(salesSessionReconciliations, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [salesSessionReconciliations.organizacaoId],
		references: [organizations.id],
	}),
	sessao: one(salesSessions, {
		fields: [salesSessionReconciliations.sessaoVendaId],
		references: [salesSessions.id],
	}),
}));

export type TSalesSessionReconciliation = typeof salesSessionReconciliations.$inferSelect;
export type TNewSalesSessionReconciliation = typeof salesSessionReconciliations.$inferInsert;
