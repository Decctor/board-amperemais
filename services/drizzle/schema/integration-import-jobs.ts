import { sql } from "drizzle-orm";
import { index, integer, jsonb, text, timestamp, uniqueIndex, varchar, boolean } from "drizzle-orm/pg-core";
import { EMPTY_IMPORT_COUNTERS, type TImportJobCounters } from "@/schemas/import-jobs";
import { newTable } from "./common";
import { importJobStateEnum, importJobTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { integrations } from "./integrations";
import { users } from "./users";

export const integrationImportJobs = newTable("integration_import_jobs", {
 id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
 organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "cascade" }).notNull(),
 integracaoId: varchar("integracao_id", { length: 255 }).references(() => integrations.id, { onDelete: "restrict" }).notNull(),
 tipo: importJobTypeEnum("tipo").notNull().default("HISTORICO"),
 estado: importJobStateEnum("estado").notNull().default("AGUARDANDO"),
 janelaAlvoInicio: timestamp("janela_alvo_inicio").notNull(),
 janelaAlvoFim: timestamp("janela_alvo_fim").notNull(),
 coberturaInicio: timestamp("cobertura_inicio"),
 cursorJanelaInicio: timestamp("cursor_janela_inicio"),
 cursorJanelaFim: timestamp("cursor_janela_fim"),
 cursorPagina: integer("cursor_pagina").notNull().default(1),
 listagemConcluida: boolean("listagem_concluida").notNull().default(false),
 cursorPendentes: jsonb("cursor_pendentes").$type<string[]>().notNull().default([]),
 janelasComFalha: jsonb("janelas_com_falha").$type<Array<{ inicio: string; fim: string; motivo: string }>>().notNull().default([]),
 contadores: jsonb("contadores").$type<TImportJobCounters>().notNull().default(EMPTY_IMPORT_COUNTERS),
 cache: jsonb("cache").$type<Record<string, unknown>>().notNull().default({}),
 proximaExecucao: timestamp("proxima_execucao").defaultNow(),
 lockAte: timestamp("lock_ate"),
 tentativasConsecutivas: integer("tentativas_consecutivas").notNull().default(0),
 ultimoErro: text("ultimo_erro"),
 ultimaExecucao: timestamp("ultima_execucao"),
 dataInicio: timestamp("data_inicio").notNull().defaultNow(),
 dataConclusao: timestamp("data_conclusao"),
 autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
 organization: index("idx_import_jobs_org").on(table.organizacaoId),
 runnable: index("idx_import_jobs_runnable").on(table.estado, table.proximaExecucao),
 active: uniqueIndex("idx_import_jobs_active_integration").on(table.integracaoId).where(sql`${table.estado} IN ('AGUARDANDO', 'EM_ANDAMENTO', 'PAUSADO_LIMITE', 'AGUARDANDO_RECONEXAO')`),
}));
export type TIntegrationImportJob = typeof integrationImportJobs.$inferSelect;
