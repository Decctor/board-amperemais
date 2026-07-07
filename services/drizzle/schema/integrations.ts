import type { TIntegrationConfig } from "@/schemas/integrations";
import { relations } from "drizzle-orm";
import { boolean, index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { integrationStatusEnum, integrationTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Fundação de integrations (marketing/parceiros — Meta Ads, CAPI, etc.).
 *
 * Uma linha = uma conexão concreta (ex.: uma conta de anúncios da Meta). O `configuracao` (jsonb) é
 * tipado por uma união discriminada Zod (`TIntegrationConfig`), variando conforme o `tipo`.
 *
 * Aditiva: NÃO substitui a integração de ERP/fonte de dados, que segue inline em
 * `organizations.integracaoTipo`/`integracaoConfiguracao`.
 */
export const integrations = newTable(
	"integrations",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		tipo: integrationTypeEnum("tipo").notNull(),
		ativo: boolean("ativo").notNull().default(false),
		// Rótulo opcional p/ distinguir múltiplas conexões do mesmo tipo (ex.: várias contas Meta).
		apelido: text("apelido"),
		// Id externo canônico da conexão (META_ADS = adAccountId). Usado p/ unicidade e busca.
		refExterno: varchar("ref_externo", { length: 255 }),
		configuracao: jsonb("configuracao").$type<TIntegrationConfig>(),
		status: integrationStatusEnum("status").notNull().default("CONECTADO"),
		ultimoErro: text("ultimo_erro"),
		dataUltimaSincronizacao: timestamp("data_ultima_sincronizacao"),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao", { mode: "date" }).$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoTipoIdx: index("idx_integrations_org_tipo").on(table.organizacaoId, table.tipo),
		// Evita conexão duplicada (ex.: mesma conta Meta duas vezes na mesma organização).
		organizacaoTipoRefUnique: uniqueIndex("idx_integrations_org_tipo_ref_unique").on(table.organizacaoId, table.tipo, table.refExterno),
	}),
);

export const integrationsRelations = relations(integrations, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [integrations.organizacaoId],
		references: [organizations.id],
	}),
	autor: one(users, {
		fields: [integrations.autorId],
		references: [users.id],
	}),
}));

export type TIntegrationEntity = typeof integrations.$inferSelect;
export type TNewIntegrationEntity = typeof integrations.$inferInsert;
