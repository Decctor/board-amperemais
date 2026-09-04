import { relations } from "drizzle-orm";
import { index, jsonb, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import type { TClientDuplicateReason, TClientMergeFieldChoices } from "@/schemas/clients";
import type { TClientDuplicateStatusEnum } from "@/schemas/enums";
import { clients } from "./clients";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Par de clientes com possível duplicidade, detectado por sinais determinísticos
 * (telefone base, e-mail, cpf/cnpj, @username do Instagram). O par é normalizado
 * com clienteAId < clienteBId; o índice único é o que torna um descarte
 * permanente — a redetecção usa onConflictDoNothing e nunca ressuscita um
 * DESCARTADO. Plano: docs/dev-planning/client-duplicate-reconciliation-plan.md.
 */
export const clientDuplicateCandidates = newTable(
	"client_duplicate_candidates",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		clienteAId: varchar("cliente_a_id", { length: 255 })
			.references(() => clients.id, { onDelete: "cascade" })
			.notNull(),
		clienteBId: varchar("cliente_b_id", { length: 255 })
			.references(() => clients.id, { onDelete: "cascade" })
			.notNull(),
		motivos: jsonb("motivos").$type<TClientDuplicateReason[]>().notNull(),
		status: varchar("status", { length: 16 }).$type<TClientDuplicateStatusEnum>().notNull().default("PENDENTE"),
		descarteData: timestamp("descarte_data"),
		descarteAutorId: varchar("descarte_autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao"),
	},
	(table) => ({
		pairUnique: uniqueIndex("client_duplicate_candidates_pair_unique_idx").on(table.organizacaoId, table.clienteAId, table.clienteBId),
		organizacaoStatusIdx: index("idx_client_duplicate_candidates_org_status").on(table.organizacaoId, table.status),
		// Lookup do pill nas páginas de detalhe — o cliente pode estar em qualquer lado do par.
		clienteAIdx: index("idx_client_duplicate_candidates_org_cliente_a").on(table.organizacaoId, table.clienteAId),
		clienteBIdx: index("idx_client_duplicate_candidates_org_cliente_b").on(table.organizacaoId, table.clienteBId),
	}),
);

export const clientDuplicateCandidatesRelations = relations(clientDuplicateCandidates, ({ one }) => ({
	organizacao: one(organizations, { fields: [clientDuplicateCandidates.organizacaoId], references: [organizations.id] }),
	clienteA: one(clients, {
		fields: [clientDuplicateCandidates.clienteAId],
		references: [clients.id],
		relationName: "client_duplicate_cliente_a",
	}),
	clienteB: one(clients, {
		fields: [clientDuplicateCandidates.clienteBId],
		references: [clients.id],
		relationName: "client_duplicate_cliente_b",
	}),
	descarteAutor: one(users, { fields: [clientDuplicateCandidates.descarteAutorId], references: [users.id] }),
}));

export type TClientDuplicateCandidateEntity = typeof clientDuplicateCandidates.$inferSelect;
export type TNewClientDuplicateCandidateEntity = typeof clientDuplicateCandidates.$inferInsert;

/**
 * Auditoria de merges: snapshot integral do cliente de origem (que é hard-deleted)
 * + o que foi movido + saldos de cashback antes/depois por programa. Os ids de
 * cliente são varchar sem FK de propósito — a origem deixa de existir e o keeper
 * pode ser mesclado novamente no futuro.
 */
export const clientMergeLogs = newTable(
	"client_merge_logs",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		keeperClienteId: varchar("keeper_cliente_id", { length: 255 }).notNull(),
		origemClienteId: varchar("origem_cliente_id", { length: 255 }).notNull(),
		candidatoId: varchar("candidato_id", { length: 255 }),
		/** Linha completa do cliente de origem + tags + campos personalizados + localizações + saldos, para recuperação manual. */
		origemSnapshot: jsonb("origem_snapshot").$type<Record<string, unknown>>().notNull(),
		camposEscolhidos: jsonb("campos_escolhidos").$type<TClientMergeFieldChoices>(),
		/** Contagem de registros re-apontados por tabela. */
		registrosMovidos: jsonb("registros_movidos").$type<Record<string, number>>(),
		/** { [programaId]: { keeperAntes, origemAntes, keeperDepois } } — disponível/acumulado/resgatado. */
		saldosCashback: jsonb("saldos_cashback").$type<Record<string, unknown>>(),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoKeeperIdx: index("idx_client_merge_logs_org_keeper").on(table.organizacaoId, table.keeperClienteId),
	}),
);

export const clientMergeLogsRelations = relations(clientMergeLogs, ({ one }) => ({
	organizacao: one(organizations, { fields: [clientMergeLogs.organizacaoId], references: [organizations.id] }),
	autor: one(users, { fields: [clientMergeLogs.autorId], references: [users.id] }),
}));

export type TClientMergeLogEntity = typeof clientMergeLogs.$inferSelect;
export type TNewClientMergeLogEntity = typeof clientMergeLogs.$inferInsert;
