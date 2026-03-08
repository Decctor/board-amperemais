import type { TAttributionModelEnum } from "@/schemas/enums";
import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { campaignAudiences } from "./campaign-audiences";
import { clients } from "./clients";
import { newTable } from "./common";
import {
	campaignFlowExecutionStatusEnum,
	campaignFlowExecutionStepStatusEnum,
	campaignFlowExecutionTypeEnum,
	campaignFlowNodeTypeEnum,
	campaignFlowStatusEnum,
	campaignFlowTypeEnum,
	interactionsCronJobTimeBlocksEnum,
	recurrenceFrequencyEnum,
} from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

// ============================================================================
// CAMPAIGN FLOWS (root entity)
// ============================================================================

export const campaignFlows = newTable("campaign_flows", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 })
		.references(() => organizations.id, { onDelete: "cascade" })
		.notNull(),
	titulo: text("titulo").notNull(),
	descricao: text("descricao"),
	status: campaignFlowStatusEnum("status").notNull().default("RASCUNHO"),
	tipo: campaignFlowTypeEnum("tipo").notNull(),

	// Recurrence config (when tipo = RECORRENTE)
	recorrenciaTipo: recurrenceFrequencyEnum("recorrencia_tipo"),
	recorrenciaIntervalo: integer("recorrencia_intervalo").default(1),
	recorrenciaDiasSemana: jsonb("recorrencia_dias_semana"),
	recorrenciaDiasMes: jsonb("recorrencia_dias_mes"),
	recorrenciaBlocoHorario: interactionsCronJobTimeBlocksEnum("recorrencia_bloco_horario"),

	// One-time config (when tipo = UNICA)
	unicaDataExecucao: timestamp("unica_data_execucao"),
	unicaExecutada: boolean("unica_executada").notNull().default(false),

	// Attribution
	atribuicaoModelo: text("atribuicao_modelo").$type<TAttributionModelEnum>().default("LAST_TOUCH").notNull(),
	atribuicaoJanelaDias: integer("atribuicao_janela_dias").default(14).notNull(),

	// Audience
	publicoId: varchar("publico_id", { length: 255 }).references(() => campaignAudiences.id, { onDelete: "set null" }),

	// Meta
	autorId: varchar("autor_id", { length: 255 })
		.references(() => users.id)
		.notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao"),
});

export const campaignFlowRelations = relations(campaignFlows, ({ one, many }) => ({
	nos: many(campaignFlowNodes),
	arestas: many(campaignFlowEdges),
	publico: one(campaignAudiences, {
		fields: [campaignFlows.publicoId],
		references: [campaignAudiences.id],
	}),
	autor: one(users, {
		fields: [campaignFlows.autorId],
		references: [users.id],
	}),
}));

export type TCampaignFlowEntity = typeof campaignFlows.$inferSelect;
export type TNewCampaignFlowEntity = typeof campaignFlows.$inferInsert;

// ============================================================================
// CAMPAIGN FLOW NODES
// ============================================================================

export const campaignFlowNodes = newTable("campaign_flow_nodes", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	campanhaId: varchar("campanha_id", { length: 255 })
		.references(() => campaignFlows.id, { onDelete: "cascade" })
		.notNull(),
	tipo: campaignFlowNodeTypeEnum("tipo").notNull(),
	subtipo: text("subtipo").notNull(),
	rotulo: text("rotulo"),
	configuracao: jsonb("configuracao").notNull(),

	// React Flow position
	posicaoX: doublePrecision("posicao_x"),
	posicaoY: doublePrecision("posicao_y"),

	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});

export const campaignFlowNodeRelations = relations(campaignFlowNodes, ({ one }) => ({
	campanha: one(campaignFlows, {
		fields: [campaignFlowNodes.campanhaId],
		references: [campaignFlows.id],
	}),
}));

export type TCampaignFlowNodeEntity = typeof campaignFlowNodes.$inferSelect;
export type TNewCampaignFlowNodeEntity = typeof campaignFlowNodes.$inferInsert;

// ============================================================================
// CAMPAIGN FLOW EDGES
// ============================================================================

export const campaignFlowEdges = newTable("campaign_flow_edges", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	campanhaId: varchar("campanha_id", { length: 255 })
		.references(() => campaignFlows.id, { onDelete: "cascade" })
		.notNull(),
	noOrigemId: varchar("no_origem_id", { length: 255 })
		.references(() => campaignFlowNodes.id, { onDelete: "cascade" })
		.notNull(),
	noDestinoId: varchar("no_destino_id", { length: 255 })
		.references(() => campaignFlowNodes.id, { onDelete: "cascade" })
		.notNull(),
	condicaoLabel: text("condicao_label"),
	ordem: integer("ordem").default(0),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});

export const campaignFlowEdgeRelations = relations(campaignFlowEdges, ({ one }) => ({
	campanha: one(campaignFlows, {
		fields: [campaignFlowEdges.campanhaId],
		references: [campaignFlows.id],
	}),
	noOrigem: one(campaignFlowNodes, {
		fields: [campaignFlowEdges.noOrigemId],
		references: [campaignFlowNodes.id],
		relationName: "edgeOrigem",
	}),
	noDestino: one(campaignFlowNodes, {
		fields: [campaignFlowEdges.noDestinoId],
		references: [campaignFlowNodes.id],
		relationName: "edgeDestino",
	}),
}));

export type TCampaignFlowEdgeEntity = typeof campaignFlowEdges.$inferSelect;
export type TNewCampaignFlowEdgeEntity = typeof campaignFlowEdges.$inferInsert;

// ============================================================================
// CAMPAIGN FLOW EXECUTIONS
// ============================================================================

export const campaignFlowExecutions = newTable(
	"campaign_flow_executions",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campanhaId: varchar("campanha_id", { length: 255 })
			.references(() => campaignFlows.id, { onDelete: "cascade" })
			.notNull(),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		tipo: campaignFlowExecutionTypeEnum("tipo").notNull(),

		// Individual execution (event-driven)
		clienteId: varchar("cliente_id", { length: 255 }).references(() => clients.id, { onDelete: "cascade" }),
		eventoTipo: text("evento_tipo"),
		eventoMetadados: jsonb("evento_metadados"),

		// Batch execution (recurrent/one-time)
		loteTotalClientes: integer("lote_total_clientes"),
		loteClientesProcessados: integer("lote_clientes_processados").default(0),

		// Status
		status: campaignFlowExecutionStatusEnum("status").notNull().default("PENDENTE"),
		dataInicio: timestamp("data_inicio"),
		dataConclusao: timestamp("data_conclusao"),
		erro: text("erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),

		// Vercel Workflow tracking
		vercelWorkflowRunId: text("vercel_workflow_run_id"),
	},
	(table) => ({
		campanhaStatusIdx: index("idx_cf_executions_campanha").on(table.campanhaId, table.status),
	}),
);

export const campaignFlowExecutionRelations = relations(campaignFlowExecutions, ({ one, many }) => ({
	campanha: one(campaignFlows, {
		fields: [campaignFlowExecutions.campanhaId],
		references: [campaignFlows.id],
	}),
	cliente: one(clients, {
		fields: [campaignFlowExecutions.clienteId],
		references: [clients.id],
	}),
	steps: many(campaignFlowExecutionSteps),
}));

export type TCampaignFlowExecutionEntity = typeof campaignFlowExecutions.$inferSelect;
export type TNewCampaignFlowExecutionEntity = typeof campaignFlowExecutions.$inferInsert;

// ============================================================================
// CAMPAIGN FLOW EXECUTION STEPS
// ============================================================================

export const campaignFlowExecutionSteps = newTable(
	"campaign_flow_execution_steps",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		execucaoId: varchar("execucao_id", { length: 255 })
			.references(() => campaignFlowExecutions.id, { onDelete: "cascade" })
			.notNull(),
		noId: varchar("no_id", { length: 255 })
			.references(() => campaignFlowNodes.id, { onDelete: "cascade" })
			.notNull(),
		clienteId: varchar("cliente_id", { length: 255 })
			.references(() => clients.id, { onDelete: "cascade" })
			.notNull(),

		// Status
		status: campaignFlowExecutionStepStatusEnum("status").notNull().default("PENDENTE"),
		resultado: jsonb("resultado"),
		erro: text("erro"),

		// Delay tracking
		delayAte: timestamp("delay_ate"),

		// Timestamps
		dataInicio: timestamp("data_inicio"),
		dataConclusao: timestamp("data_conclusao"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		execucaoStatusIdx: index("idx_cf_steps_execucao").on(table.execucaoId, table.status),
		clienteNoIdx: index("idx_cf_steps_cliente").on(table.clienteId, table.noId),
	}),
);

export const campaignFlowExecutionStepRelations = relations(campaignFlowExecutionSteps, ({ one }) => ({
	execucao: one(campaignFlowExecutions, {
		fields: [campaignFlowExecutionSteps.execucaoId],
		references: [campaignFlowExecutions.id],
	}),
	no: one(campaignFlowNodes, {
		fields: [campaignFlowExecutionSteps.noId],
		references: [campaignFlowNodes.id],
	}),
	cliente: one(clients, {
		fields: [campaignFlowExecutionSteps.clienteId],
		references: [clients.id],
	}),
}));

export type TCampaignFlowExecutionStepEntity = typeof campaignFlowExecutionSteps.$inferSelect;
export type TNewCampaignFlowExecutionStepEntity = typeof campaignFlowExecutionSteps.$inferInsert;
