import { relations } from "drizzle-orm";
import { boolean, integer, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";

// Cadência de comunicação por segmento RFM (docs/seller-routine-hub-design.md §4).
// A fila da carteira do vendedor é o "débito de comunicação": dias desde a última
// interação vs. a cadência ideal do segmento. Só existem linhas para overrides da
// organização — os defaults por segmento vivem em lib/client-portfolios/cadence.ts.
export const segmentCadences = newTable(
	"segment_cadences",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// Label RFM (utils/rfm.ts — ex.: "CAMPEÕES", "EM RISCO").
		segmento: text("segmento").notNull(),
		// Teto: acima disso o cliente entra em débito de comunicação (candidato à fila).
		diasIdealEntreContatos: integer("dias_ideal_entre_contatos").notNull(),
		// Piso de fadiga: abaixo disso o cliente nunca entra na fila, mesmo em débito.
		diasMinimoEntreContatos: integer("dias_minimo_entre_contatos").notNull(),
		// Desliga o segmento da fila (ex.: PERDIDOS = nunca abordar).
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao", { mode: "date" }).$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoSegmentoUnique: uniqueIndex("segment_cadences_organizacao_segmento_unique").on(table.organizacaoId, table.segmento),
	}),
);
export const segmentCadenceRelations = relations(segmentCadences, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [segmentCadences.organizacaoId],
		references: [organizations.id],
	}),
}));
export type TSegmentCadenceEntity = typeof segmentCadences.$inferSelect;
export type TNewSegmentCadenceEntity = typeof segmentCadences.$inferInsert;
