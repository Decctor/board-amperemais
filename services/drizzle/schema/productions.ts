import { relations } from "drizzle-orm";
import { boolean, doublePrecision, index, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { timeDurationUnitsEnum } from "./enums";
import { organizations } from "./organizations";
import { productVariants, products } from "./products";

export const productionRecipes = newTable(
	"production_recipes",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		titulo: text("titulo").notNull(),
		descricao: text("descricao"),
		previsaoTempoMedida: timeDurationUnitsEnum("previsao_tempo_medida"),
		previsaoTempoValor: doublePrecision("previsao_tempo_valor"),
		ativo: boolean("ativo").default(true).notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoIdx: index("idx_production_recipes_organizacao").on(table.organizacaoId),
		ativoIdx: index("idx_production_recipes_ativo").on(table.ativo),
	}),
);

export const productionRecipesRelations = relations(productionRecipes, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [productionRecipes.organizacaoId],
		references: [organizations.id],
	}),
	insumos: many(productionRecipeInputs),
	saidas: many(productionRecipeOutputs),
}));

export type TProductionRecipeEntity = typeof productionRecipes.$inferSelect;
export type TNewProductionRecipeEntity = typeof productionRecipes.$inferInsert;

export const productionRecipeInputs = newTable(
	"production_recipe_inputs",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		receitaId: varchar("receita_id", { length: 255 })
			.notNull()
			.references(() => productionRecipes.id, { onDelete: "cascade" }),
		produtoId: varchar("produto_id", { length: 255 })
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		produtoVarianteId: varchar("produto_variante_id", { length: 255 }).references(() => productVariants.id, { onDelete: "set null" }),
		quantidade: doublePrecision("quantidade").notNull(),
	},
	(table) => ({
		receitaIdx: index("idx_production_recipe_inputs_receita").on(table.receitaId),
		produtoIdx: index("idx_production_recipe_inputs_produto").on(table.produtoId),
	}),
);

export const productionRecipeInputsRelations = relations(productionRecipeInputs, ({ one }) => ({
	receita: one(productionRecipes, {
		fields: [productionRecipeInputs.receitaId],
		references: [productionRecipes.id],
	}),
	produto: one(products, {
		fields: [productionRecipeInputs.produtoId],
		references: [products.id],
	}),
	produtoVariante: one(productVariants, {
		fields: [productionRecipeInputs.produtoVarianteId],
		references: [productVariants.id],
	}),
}));

export type TProductionRecipeInputEntity = typeof productionRecipeInputs.$inferSelect;
export type TNewProductionRecipeInputEntity = typeof productionRecipeInputs.$inferInsert;

export const productionRecipeOutputs = newTable(
	"production_recipe_outputs",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		receitaId: varchar("receita_id", { length: 255 })
			.notNull()
			.references(() => productionRecipes.id, { onDelete: "cascade" }),
		produtoId: varchar("produto_id", { length: 255 })
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		produtoVarianteId: varchar("produto_variante_id", { length: 255 }).references(() => productVariants.id, { onDelete: "set null" }),
		quantidade: doublePrecision("quantidade").notNull(),
		prazoValidadeMedida: timeDurationUnitsEnum("prazo_validade_medida"),
		prazoValidadeValor: doublePrecision("prazo_validade_valor"),
	},
	(table) => ({
		receitaIdx: index("idx_production_recipe_outputs_receita").on(table.receitaId),
		produtoIdx: index("idx_production_recipe_outputs_produto").on(table.produtoId),
	}),
);

export const productionRecipeOutputsRelations = relations(productionRecipeOutputs, ({ one }) => ({
	receita: one(productionRecipes, {
		fields: [productionRecipeOutputs.receitaId],
		references: [productionRecipes.id],
	}),
	produto: one(products, {
		fields: [productionRecipeOutputs.produtoId],
		references: [products.id],
	}),
	produtoVariante: one(productVariants, {
		fields: [productionRecipeOutputs.produtoVarianteId],
		references: [productVariants.id],
	}),
}));

export type TProductionRecipeOutputEntity = typeof productionRecipeOutputs.$inferSelect;
export type TNewProductionRecipeOutputEntity = typeof productionRecipeOutputs.$inferInsert;
