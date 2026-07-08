import type { TCampaignFilters } from "@/schemas/campaigns";
import { relations } from "drizzle-orm";
import { doublePrecision, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { audienceDestinationStatusEnum } from "./enums";
import { integrations } from "./integrations";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Audiences (públicos) — definição de segmento AGNÓSTICA de plataforma. Reusa o motor de filtros das
 * campanhas (`TCampaignFilters` + `resolveCampaignAudienceClientIds`): o mesmo `filtros`/`segmentacoes`
 * que já resolve "segmento -> lista de clientes". Um público pode ter N destinos (Meta hoje; outros no futuro).
 */
export const audiences = newTable("audiences", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 })
		.references(() => organizations.id, { onDelete: "cascade" })
		.notNull(),
	nome: text("nome").notNull(),
	descricao: text("descricao"),
	// Árvore de filtros recursiva (AND/OR/NOT) — mesma estrutura das campanhas.
	filtros: jsonb("filtros").$type<TCampaignFilters>(),
	// Chaves de segmentação RFM (opcional) — mesma semântica de `campaign.segmentacoes`.
	segmentacoes: jsonb("segmentacoes").$type<string[]>().notNull().default([]),
	autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao", { mode: "date" }).$onUpdate(() => new Date()),
});

export const audiencesRelations = relations(audiences, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [audiences.organizacaoId],
		references: [organizations.id],
	}),
	autor: one(users, {
		fields: [audiences.autorId],
		references: [users.id],
	}),
	destinos: many(audienceDestinations),
}));

export type TAudienceEntity = typeof audiences.$inferSelect;
export type TNewAudienceEntity = typeof audiences.$inferInsert;

/**
 * Destino de um público numa plataforma externa (ex.: Custom Audience na Meta). Liga o público
 * agnóstico a uma integração concreta + o id externo + estatísticas do último sync.
 */
export const audienceDestinations = newTable(
	"audience_destinations",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		audienciaId: varchar("audiencia_id", { length: 255 })
			.references(() => audiences.id, { onDelete: "cascade" })
			.notNull(),
		integracaoId: varchar("integracao_id", { length: 255 })
			.references(() => integrations.id, { onDelete: "cascade" })
			.notNull(),
		// ID da Custom Audience na Meta.
		externalId: varchar("external_id", { length: 255 }),
		status: audienceDestinationStatusEnum("status").notNull().default("PENDENTE"),
		// Taxa de correspondência aproximada retornada pela Meta (0-1).
		matchRate: doublePrecision("match_rate"),
		qtdeEnviada: integer("qtde_enviada").notNull().default(0),
		ultimaSincronizacao: timestamp("ultima_sincronizacao"),
		ultimoErro: text("ultimo_erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao", { mode: "date" }).$onUpdate(() => new Date()),
	},
	(table) => ({
		audienciaIntegracaoUnique: uniqueIndex("idx_audience_destinations_audiencia_integracao_unique").on(table.audienciaId, table.integracaoId),
		integracaoIdx: index("idx_audience_destinations_integracao").on(table.integracaoId),
	}),
);

export const audienceDestinationsRelations = relations(audienceDestinations, ({ one, many }) => ({
	audiencia: one(audiences, {
		fields: [audienceDestinations.audienciaId],
		references: [audiences.id],
	}),
	integracao: one(integrations, {
		fields: [audienceDestinations.integracaoId],
		references: [integrations.id],
	}),
	membros: many(audienceDestinationMembers),
}));

export type TAudienceDestinationEntity = typeof audienceDestinations.$inferSelect;
export type TNewAudienceDestinationEntity = typeof audienceDestinations.$inferInsert;

/**
 * Membros já enviados de um destino, com os HASHES de e-mail/telefone. Guardar o hash (não a PII
 * crua) permite (a) calcular o delta a cada sync (add/remove) e (b) REMOVER da Meta clientes que
 * saíram do segmento — inclusive os já apagados do banco (propagação de exclusão / LGPD), pois não
 * é possível re-hashear a PII de um cliente que não existe mais.
 *
 * `clienteId` é varchar simples (sem FK) de propósito: a exclusão do cliente NÃO deve apagar este
 * registro — é ele que carrega o hash necessário para o DELETE na Meta na próxima sincronização.
 */
export const audienceDestinationMembers = newTable(
	"audience_destination_members",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		destinoId: varchar("destino_id", { length: 255 })
			.references(() => audienceDestinations.id, { onDelete: "cascade" })
			.notNull(),
		clienteId: varchar("cliente_id", { length: 255 }).notNull(),
		emailHash: varchar("email_hash", { length: 64 }),
		telefoneHash: varchar("telefone_hash", { length: 64 }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		destinoClienteUnique: uniqueIndex("idx_audience_destination_members_destino_cliente_unique").on(table.destinoId, table.clienteId),
		destinoIdx: index("idx_audience_destination_members_destino").on(table.destinoId),
	}),
);

export const audienceDestinationMembersRelations = relations(audienceDestinationMembers, ({ one }) => ({
	destino: one(audienceDestinations, {
		fields: [audienceDestinationMembers.destinoId],
		references: [audienceDestinations.id],
	}),
}));

export type TAudienceDestinationMemberEntity = typeof audienceDestinationMembers.$inferSelect;
export type TNewAudienceDestinationMemberEntity = typeof audienceDestinationMembers.$inferInsert;
