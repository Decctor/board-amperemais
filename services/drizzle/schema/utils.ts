import type { TUtilsNuvemFiscalApiTokenValor, TUtilsValue } from "@/schemas/utils";
import { jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { relations } from "drizzle-orm";

/** Util global (organizacaoId null) com access token OAuth da integracao Nuvem Fiscal. */
export const NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR = "NUVEM_FISCAL_API_TOKEN" as const;

export type TNuvemFiscalApiTokenUtilRecord = {
	identificador: typeof NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR;
	valor: TUtilsNuvemFiscalApiTokenValor;
	organizacaoId: null;
};

export const utils = newTable("utils", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "cascade" }),
	identificador: text("identificador").notNull(),
	valor: jsonb("valor").$type<TUtilsValue>().notNull(),
	dataUltimaAtualizacao: timestamp("data_ultima_atualizacao").defaultNow().notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
export type TUtilEntity = typeof utils.$inferSelect;
export type TNewUtilEntity = typeof utils.$inferInsert;

export const utilsRelations = relations(utils, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [utils.organizacaoId],
		references: [organizations.id],
	}),
}));
