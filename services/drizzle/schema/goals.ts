import { relations } from "drizzle-orm";
import { doublePrecision, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { sellers } from "./sellers";

export const goals = newTable("goals", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	dataInicio: timestamp("data_inicio").notNull(),
	dataFim: timestamp("data_fim").notNull(),
	objetivoValor: doublePrecision("objetivo_valor").notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export const goalsRelations = relations(goals, ({ many }) => ({
	vendedores: many(goalsSellers),
}));

export const goalsSellers = newTable("goals_sellers", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	metaId: varchar("goal_id", { length: 255 })
		.references(() => goals.id)
		.notNull(),
	vendedorId: varchar("vendedor_id", { length: 255 })
		.references(() => sellers.id)
		.notNull(),
	objetivoValor: doublePrecision("objetivo_valor").notNull(),
});

export const goalsSellersRelations = relations(goalsSellers, ({ one }) => ({
	meta: one(goals, {
		fields: [goalsSellers.metaId],
		references: [goals.id],
	}),
	vendedor: one(sellers, {
		fields: [goalsSellers.vendedorId],
		references: [sellers.id],
	}),
}));
