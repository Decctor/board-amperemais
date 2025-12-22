import { relations } from "drizzle-orm";
import { doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { boolean, text, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { newTable } from "./common";
import { cashbackProgramAccumulationTypeEnum, cashbackProgramTransactionStatusEnum, cashbackProgramTransactionTypeEnum } from "./enums";
import { sales } from "./sales";

export const cashbackPrograms = newTable("cashback_programs", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	ativo: boolean("ativo").notNull().default(true),
	titulo: text("titulo").notNull(),
	descricao: text("descricao"),
	acumuloTipo: cashbackProgramAccumulationTypeEnum().notNull().default("FIXO"),
	acumuloValor: doublePrecision("acumulo_valor").notNull().default(0),
	acumuloRegraValorMinimo: doublePrecision("acumulo_regra_valor_minimo").notNull().default(0),
	expiracaoRegraValidadeValor: doublePrecision("expiracao_regra_validade_valor").notNull().default(0),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
});
export const cashbackProgramRelations = relations(cashbackPrograms, ({ many }) => ({
	saldos: many(cashbackProgramBalances),
	transacoes: many(cashbackProgramTransactions),
}));

export const cashbackProgramBalances = newTable("cashback_program_balances", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	clienteId: varchar("cliente_id", { length: 255 })
		.references(() => clients.id)
		.notNull(),
	programaId: varchar("programa_id", { length: 255 })
		.references(() => cashbackPrograms.id)
		.notNull(),
	saldoValorDisponivel: doublePrecision("saldo_valor_disponivel").notNull().default(0),
	saldoValorAcumuladoTotal: doublePrecision("saldo_valor_acumulado_total").notNull().default(0),
	saldoValorResgatadoTotal: doublePrecision("saldo_valor_resgatado_total").notNull().default(0),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
});
export const cashbackProgramBalanceRelations = relations(cashbackProgramBalances, ({ one }) => ({
	cliente: one(clients, {
		fields: [cashbackProgramBalances.clienteId],
		references: [clients.id],
	}),
	programa: one(cashbackPrograms, {
		fields: [cashbackProgramBalances.programaId],
		references: [cashbackPrograms.id],
	}),
}));

export const cashbackProgramTransactions = newTable("cashback_program_transactions", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	clienteId: varchar("cliente_id", { length: 255 })
		.references(() => clients.id)
		.notNull(),
	vendaId: varchar("venda_id", { length: 255 }).references(() => sales.id),
	programaId: varchar("programa_id", { length: 255 })
		.references(() => cashbackPrograms.id)
		.notNull(),
	status: cashbackProgramTransactionStatusEnum("status").notNull().default("ATIVO"),
	tipo: cashbackProgramTransactionTypeEnum("tipo").notNull(),
	valor: doublePrecision("valor").notNull(),
	valorRestante: doublePrecision("valor_restante").notNull(),

	saldoValorAnterior: doublePrecision("saldo_valor_anterior").notNull(),
	saldoValorPosterior: doublePrecision("saldo_valor_posterior").notNull(),

	expiracaoData: timestamp("expiracao_data"),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
});
export const cashbackProgramTransactionRelations = relations(cashbackProgramTransactions, ({ one }) => ({
	venda: one(sales, {
		fields: [cashbackProgramTransactions.vendaId],
		references: [sales.id],
	}),
	cliente: one(clients, {
		fields: [cashbackProgramTransactions.clienteId],
		references: [clients.id],
	}),
	programa: one(cashbackPrograms, {
		fields: [cashbackProgramTransactions.programaId],
		references: [cashbackPrograms.id],
	}),
}));
