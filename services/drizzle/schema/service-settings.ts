import type { TServiceSettingsConfiguration } from "@/schemas/service-settings";
import { relations } from "drizzle-orm";
import { index, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";

// ============================================================================
// SERVICE SETTINGS (Configuracao de atendimento — mesas/comandas)
// 1:1 por organizacao, padrao shopSettings. A UI oferece presets (Balcao,
// Somente mesas, Somente comandas, Mesas + comandas), mas persistimos as
// politicas — modos de operacao nao sao entidades.
// ============================================================================

export const serviceSettings = newTable(
	"service_settings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull()
			.unique(),
		configuracoes: jsonb("configuracoes").$type<TServiceSettingsConfiguration>().notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
	},
	(table) => ({
		organizacaoIdx: index("idx_service_settings_organizacao").on(table.organizacaoId),
	}),
);

export const serviceSettingsRelations = relations(serviceSettings, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [serviceSettings.organizacaoId],
		references: [organizations.id],
	}),
}));

export type TServiceSettingsEntity = typeof serviceSettings.$inferSelect;
export type TNewServiceSettingsEntity = typeof serviceSettings.$inferInsert;
