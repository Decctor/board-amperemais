// Impressão via agente desktop local (recompra-local-agent): impressoras sincronizadas pelo
// agent e fila durável de jobs de impressão. O agent é um principal AGENTE_DESKTOP da fundação
// de acesso externo (ver access.ts). Modelo e decisões: docs/dev-planning/desktop-agent-printing-plan.md.
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { accessPrincipals } from "./access";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { users } from "./users";

// finalidade/formato/driver/status NÃO são pgEnum de propósito (mesmo racional de access_events):
// varchar + z.enum no app, para que novos valores não custem migração de enum no Postgres.

export const agentPrinters = newTable(
	"agent_printers",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		principalId: varchar("principal_id", { length: 255 })
			.references(() => accessPrincipals.id, { onDelete: "cascade" })
			.notNull(),
		// Nome da impressora no SO — a chave natural do sync (upsert por principal + nome).
		nomeSistema: varchar("nome_sistema", { length: 255 }).notNull(),
		apelido: text("apelido"),
		driver: varchar("driver", { length: 30 }).$type<"DRIVER_SO" | "ZPL_REDE">().notNull().default("DRIVER_SO"),
		// Roteamento: quais finalidades esta impressora atende (late binding no claim).
		finalidades: jsonb("finalidades").$type<string[]>().notNull().default([]),
		// `ativa` é controle do dashboard; `disponivel` é reportado pelo sync (sumiu do SO → false).
		ativa: boolean("ativa").notNull().default(true),
		disponivel: boolean("disponivel").notNull().default(true),
		// tcpHost/tcpPort (ZPL de rede), larguraPapel (58/80mm) etc.
		metadados: jsonb("metadados").$type<Record<string, unknown>>(),
		ultimaSincronizacao: timestamp("ultima_sincronizacao"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		principalNomeSistemaIdx: uniqueIndex("idx_agent_printers_principal_nome_sistema").on(table.principalId, table.nomeSistema),
		organizacaoIdIdx: index("idx_agent_printers_organizacao_id").on(table.organizacaoId),
	}),
);

export const printJobs = newTable(
	"print_jobs",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Sem FK enquanto lojas não forem entidade do schema (mesmo racional de access_principals.loja_id).
		// Agent só claima jobs da sua loja ou sem loja.
		lojaId: varchar("loja_id", { length: 255 }),
		finalidade: varchar("finalidade", { length: 30 }).$type<"CUPOM_VENDA" | "ETIQUETA_LOTE" | "DANFE_NFCE" | "DANFE_NFE" | "TESTE">().notNull(),
		formato: varchar("formato", { length: 30 }).$type<"HTML" | "PDF_URL" | "ZPL">().notNull(),
		// Conteúdo renderizado no servidor — o agent é burro (plano, decisão 2).
		conteudo: text("conteudo"),
		conteudoUrl: text("conteudo_url"),
		copias: integer("copias").notNull().default(1),
		// Snapshot estruturado da origem — reimpressão e debug, nunca re-renderização no agent.
		dados: jsonb("dados").$type<Record<string, unknown>>(),
		origemTipo: varchar("origem_tipo", { length: 30 }).$type<"VENDA" | "LOTE" | "NOTA_FISCAL" | "MANUAL">().notNull(),
		origemId: varchar("origem_id", { length: 255 }),
		// Nullable (jobs manuais); unicidade por (organizacao, chave) impede duplicar auto-print.
		chaveIdempotencia: varchar("chave_idempotencia", { length: 255 }),
		status: varchar("status", { length: 30 })
			.$type<"PENDENTE" | "PROCESSANDO" | "IMPRESSO" | "ERRO" | "CANCELADO" | "EXPIRADO">()
			.notNull()
			.default("PENDENTE"),
		// Lease de claim — mesmo padrão de poi_transaction_idempotency_requests.
		tentativaId: varchar("tentativa_id", { length: 255 }),
		leaseExpiraEm: timestamp("lease_expira_em"),
		numeroTentativas: integer("numero_tentativas").notNull().default(0),
		// Override de reimpressão, ou carimbada no claim (quem imprimiu de fato).
		impressoraId: varchar("impressora_id", { length: 255 }).references(() => agentPrinters.id, { onDelete: "set null" }),
		principalId: varchar("principal_id", { length: 255 }).references(() => accessPrincipals.id, { onDelete: "set null" }),
		erro: text("erro"),
		// TTL por finalidade: cupom atrasado é pior que cupom nenhum (plano, ciclo de vida).
		expiraEm: timestamp("expira_em").notNull(),
		solicitadoPorId: varchar("solicitado_por_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		dataConclusao: timestamp("data_conclusao"),
	},
	(table) => ({
		organizacaoChaveIdempotenciaIdx: uniqueIndex("idx_print_jobs_org_chave_idempotencia").on(table.organizacaoId, table.chaveIdempotencia),
		// Sustenta o claim e a listagem do dashboard.
		organizacaoStatusDataIdx: index("idx_print_jobs_organizacao_status_data").on(table.organizacaoId, table.status, table.dataInsercao),
	}),
);

export const agentPrintersRelations = relations(agentPrinters, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [agentPrinters.organizacaoId],
		references: [organizations.id],
	}),
	principal: one(accessPrincipals, {
		fields: [agentPrinters.principalId],
		references: [accessPrincipals.id],
	}),
	jobs: many(printJobs),
}));

export const printJobsRelations = relations(printJobs, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [printJobs.organizacaoId],
		references: [organizations.id],
	}),
	impressora: one(agentPrinters, {
		fields: [printJobs.impressoraId],
		references: [agentPrinters.id],
	}),
	principal: one(accessPrincipals, {
		fields: [printJobs.principalId],
		references: [accessPrincipals.id],
	}),
	solicitadoPor: one(users, {
		fields: [printJobs.solicitadoPorId],
		references: [users.id],
	}),
}));

export type TAgentPrinterEntity = typeof agentPrinters.$inferSelect;
export type TNewAgentPrinterEntity = typeof agentPrinters.$inferInsert;
export type TPrintJobEntity = typeof printJobs.$inferSelect;
export type TNewPrintJobEntity = typeof printJobs.$inferInsert;
