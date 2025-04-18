import { text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { sales } from "./sales";
import { relations } from "drizzle-orm";

export const clients = newTable("clients", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nome: text("nome").notNull(),
	telefone: text("telefone"),
	email: text("email"),
	canalAquisicao: text("canal_aquisicao"),
	primeiraCompraData: timestamp("primeira_compra_data"),
	primeiraCompraId: varchar("primeira_compra_id"),
	ultimaCompraData: timestamp("ultima_compra_data"),
	ultimaCompraId: varchar("ultima_compra_id"),
	analiseRFMTitulo: text("analise_rfm_titulo"),
	analiseRFMNotasRecencia: text("analise_rfm_notas_recencia"),
	analiseRFMNotasFrequencia: text("analise_rfm_notas_frequencia"),
	analiseRFMNotasMonetario: text("analise_rfm_notas_monetario"),
	analiseRFMUltimaAtualizacao: timestamp("analise_rfm_ultima_atualizacao"),
	dataInsercao: timestamp("data_insercao").defaultNow(),
});
export const clientsRelations = relations(clients, ({ one, many }) => ({
	compras: many(sales),
}));
export type TClientEntity = typeof clients.$inferSelect;
export type TNewClientEntity = typeof clients.$inferInsert;
