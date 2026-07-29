import type { TAiAgentCapacidades, TAiAgentConfigSnapshot, TAiAgentModeloConfig, TAiAgentUso } from "@/schemas/ai-agents";
import type {
	TAiAgentRunGatilhoEnum,
	TAiAgentRunStatusEnum,
	TAiAgentStatusEnum,
	TAiAgentToolCallStatusEnum,
	TAiAgentToolNameEnum,
} from "@/schemas/enums";
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { chatMessages, chats } from "./chats";
import { newTable } from "./common";
import { organizations } from "./organizations";

/**
 * Agentes de IA de atendimento.
 *
 * Direção de import deliberada: este arquivo importa `chats.ts`, nunca o contrário. É por isso
 * que `chat_assignments.responsavelAgenteId` não tem FK para `aiAgents` — a FK inversa criaria
 * um ciclo entre os módulos de schema.
 *
 * Mesmo desvio consciente de `chat_assignments` quanto a enums: status, gatilho e nome de
 * ferramenta são varchar + `$type<...>` + validação Zod (`schemas/enums.ts`). `ALTER TYPE` em
 * migration manual é doloroso e novos valores devem ser baratos.
 */

// ============================================================================
// AGENTE
// ============================================================================

/**
 * Um agente por organização (garantido pelo índice único). O runtime lê **esta** configuração
 * — não há versionamento; cada execução grava o snapshot da config que a produziu.
 */
export const aiAgents = newTable(
	"ai_agents",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		nome: varchar("nome", { length: 255 }).notNull().default("Agente de Atendimento"),
		// PAUSADO continua editável; o runtime recusa executar.
		status: varchar("status", { length: 32 }).$type<TAiAgentStatusEnum>().notNull().default("ATIVO"),
		// Persona, tom e regras da organização. Vira a primeira camada do system prompt.
		instrucoes: text("instrucoes").notNull(),
		modeloConfig: jsonb("modelo_config").$type<TAiAgentModeloConfig>().notNull(),
		capacidades: jsonb("capacidades").$type<TAiAgentCapacidades>().notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => [uniqueIndex("ai_agents_organizacao_unica_idx").on(table.organizacaoId)],
);
export const aiAgentsRelations = relations(aiAgents, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [aiAgents.organizacaoId],
		references: [organizations.id],
	}),
	conhecimento: many(aiAgentKnowledge),
	execucoes: many(aiAgentRuns),
}));
export type TAiAgentEntity = typeof aiAgents.$inferSelect;
export type TNewAiAgentEntity = typeof aiAgents.$inferInsert;

// ============================================================================
// BASE DE CONHECIMENTO
// ============================================================================

/**
 * Blocos de texto injetados no system prompt (políticas, horários, FAQ, diferenciais).
 *
 * Modelados em tabela — e não como um campo `text` no agente — para permitir ativar/desativar
 * individualmente e, quando o volume justificar, virar a unidade de chunking/embedding de um
 * RAG sem mudança conceitual.
 */
export const aiAgentKnowledge = newTable(
	"ai_agent_knowledge",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		agenteId: varchar("agente_id", { length: 255 })
			.references(() => aiAgents.id, { onDelete: "cascade" })
			.notNull(),
		titulo: varchar("titulo", { length: 255 }).notNull(),
		conteudo: text("conteudo").notNull(),
		ativo: boolean("ativo").notNull().default(true),
		ordem: integer("ordem").notNull().default(0),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => [index("idx_ai_agent_knowledge_agente_ativo").on(table.agenteId, table.ativo)],
);
export const aiAgentKnowledgeRelations = relations(aiAgentKnowledge, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [aiAgentKnowledge.organizacaoId],
		references: [organizations.id],
	}),
	agente: one(aiAgents, {
		fields: [aiAgentKnowledge.agenteId],
		references: [aiAgents.id],
	}),
}));
export type TAiAgentKnowledgeEntity = typeof aiAgentKnowledge.$inferSelect;
export type TNewAiAgentKnowledgeEntity = typeof aiAgentKnowledge.$inferInsert;

// ============================================================================
// EXECUÇÕES
// ============================================================================

/**
 * Uma execução do agente sobre um chat. É a fonte primária de observabilidade: o que foi
 * decidido, com qual configuração, gastando quantos tokens, e o que falhou.
 */
export const aiAgentRuns = newTable(
	"ai_agent_runs",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		agenteId: varchar("agente_id", { length: 255 })
			.references(() => aiAgents.id, { onDelete: "cascade" })
			.notNull(),
		status: varchar("status", { length: 32 }).$type<TAiAgentRunStatusEnum>().notNull().default("PENDENTE"),
		gatilho: varchar("gatilho", { length: 32 }).$type<TAiAgentRunGatilhoEnum>().notNull(),
		chatId: varchar("chat_id", { length: 255 })
			.references(() => chats.id, { onDelete: "cascade" })
			.notNull(),
		// Denormalizado (sem FK): o run sobrevive à troca de cliente do chat.
		clienteId: varchar("cliente_id", { length: 255 }),
		// Mensagem do cliente que disparou a execução.
		mensagemGatilhoId: varchar("mensagem_gatilho_id", { length: 255 }),
		// Mensagem que a execução produziu — vínculo canônico run → mensagem.
		mensagemEnviadaId: varchar("mensagem_enviada_id", { length: 255 }).references(() => chatMessages.id, { onDelete: "set null" }),
		configSnapshot: jsonb("config_snapshot").$type<TAiAgentConfigSnapshot>().notNull(),
		contextoEntradaSnapshot: jsonb("contexto_entrada_snapshot"),
		outputResumo: text("output_resumo"),
		uso: jsonb("uso").$type<TAiAgentUso>(),
		erro: text("erro"),
		dataInicio: timestamp("data_inicio"),
		dataFim: timestamp("data_fim"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => [
		index("idx_ai_agent_runs_organizacao_data").on(table.organizacaoId, table.dataInsercao.desc()),
		index("idx_ai_agent_runs_agente_status").on(table.agenteId, table.status),
		index("idx_ai_agent_runs_chat").on(table.chatId),
	],
);
export const aiAgentRunsRelations = relations(aiAgentRuns, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [aiAgentRuns.organizacaoId],
		references: [organizations.id],
	}),
	agente: one(aiAgents, {
		fields: [aiAgentRuns.agenteId],
		references: [aiAgents.id],
	}),
	chat: one(chats, {
		fields: [aiAgentRuns.chatId],
		references: [chats.id],
	}),
	mensagemEnviada: one(chatMessages, {
		fields: [aiAgentRuns.mensagemEnviadaId],
		references: [chatMessages.id],
	}),
	chamadasFerramentas: many(aiAgentToolCalls),
}));
export type TAiAgentRunEntity = typeof aiAgentRuns.$inferSelect;
export type TNewAiAgentRunEntity = typeof aiAgentRuns.$inferInsert;

/**
 * Auditoria de cada chamada de ferramenta. A linha nasce **antes** da execução (status
 * EXECUTANDO), de modo que uma ferramenta que trave ou derrube o processo ainda deixa rastro.
 */
export const aiAgentToolCalls = newTable(
	"ai_agent_tool_calls",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		runId: varchar("run_id", { length: 255 })
			.references(() => aiAgentRuns.id, { onDelete: "cascade" })
			.notNull(),
		agenteId: varchar("agente_id", { length: 255 })
			.references(() => aiAgents.id, { onDelete: "cascade" })
			.notNull(),
		ferramentaNome: varchar("ferramenta_nome", { length: 128 }).$type<TAiAgentToolNameEnum>().notNull(),
		status: varchar("status", { length: 32 }).$type<TAiAgentToolCallStatusEnum>().notNull().default("EXECUTANDO"),
		// Input já validado pelo schema Zod da ferramenta.
		input: jsonb("input"),
		output: jsonb("output"),
		erro: text("erro"),
		dataExecucao: timestamp("data_execucao"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => [index("idx_ai_agent_tool_calls_run_status").on(table.runId, table.status)],
);
export const aiAgentToolCallsRelations = relations(aiAgentToolCalls, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [aiAgentToolCalls.organizacaoId],
		references: [organizations.id],
	}),
	run: one(aiAgentRuns, {
		fields: [aiAgentToolCalls.runId],
		references: [aiAgentRuns.id],
	}),
	agente: one(aiAgents, {
		fields: [aiAgentToolCalls.agenteId],
		references: [aiAgents.id],
	}),
}));
export type TAiAgentToolCallEntity = typeof aiAgentToolCalls.$inferSelect;
export type TNewAiAgentToolCallEntity = typeof aiAgentToolCalls.$inferInsert;
