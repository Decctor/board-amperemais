import { relations } from "drizzle-orm";
import { doublePrecision, index, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { campaigns } from "./campaigns";
import { clients } from "./clients";
import { newTable } from "./common";
import { interactions } from "./interactions";
import { organizations } from "./organizations";
import { sales } from "./sales";

export const campaignConversions = newTable(
	"campaign_conversions",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
		vendaId: varchar("venda_id", { length: 255 })
			.references(() => sales.id)
			.notNull(),
		interacaoId: varchar("interacao_id", { length: 255 })
			.references(() => interactions.id)
			.notNull(),
		campanhaId: varchar("campanha_id", { length: 255 })
			.references(() => campaigns.id)
			.notNull(),
		clienteId: varchar("cliente_id", { length: 255 })
			.references(() => clients.id)
			.notNull(),

		// Attribution
		atribuicaoModelo: text("atribuicao_modelo").notNull().default("LAST_TOUCH"), // LAST_TOUCH, FIRST_TOUCH, LINEAR
		atribuicaoPeso: doublePrecision("atribuicao_peso").notNull().default(1.0),
		atribuicaoReceita: doublePrecision("atribuicao_receita").notNull(),

		// Timing
		dataInteracao: timestamp("data_interacao").notNull(),
		dataConversao: timestamp("data_conversao").notNull(),
		tempoParaConversaoMinutos: integer("tempo_para_conversao_minutos").notNull(),

		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		vendaIdIdx: index("idx_campaign_conversions_venda_id").on(table.vendaId),
		campanhaIdIdx: index("idx_campaign_conversions_campanha_id").on(table.campanhaId),
		clienteIdIdx: index("idx_campaign_conversions_cliente_id").on(table.clienteId),
		dataConversaoIdx: index("idx_campaign_conversions_data_conversao").on(table.dataConversao),
	}),
);

export const campaignConversionRelations = relations(campaignConversions, ({ one }) => ({
	venda: one(sales, {
		fields: [campaignConversions.vendaId],
		references: [sales.id],
	}),
	interacao: one(interactions, {
		fields: [campaignConversions.interacaoId],
		references: [interactions.id],
	}),
	campanha: one(campaigns, {
		fields: [campaignConversions.campanhaId],
		references: [campaigns.id],
	}),
	cliente: one(clients, {
		fields: [campaignConversions.clienteId],
		references: [clients.id],
	}),
}));

export type TCampaignConversion = typeof campaignConversions.$inferSelect;
export type TNewCampaignConversion = typeof campaignConversions.$inferInsert;
