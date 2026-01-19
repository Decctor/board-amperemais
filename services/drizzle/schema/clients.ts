import { relations, sql } from "drizzle-orm";
import { index, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { cashbackProgramBalances } from "./cashback-programs";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { sales } from "./sales";

export const clients = newTable(
	"clients",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id),
		nome: text("nome").notNull(),
		// cpfCnpj: text("cpf_cnpj"),
		// Communication
		telefone: text("telefone").notNull().default(""),
		telefoneBase: text("telefone_base").notNull().default(""),
		email: text("email"),
		// Location
		localizacaoCep: text("localizacao_cep"),
		localizacaoEstado: text("localizacao_estado"),
		localizacaoCidade: text("localizacao_cidade"),
		localizacaoBairro: text("localizacao_bairro"),
		localizacaoLogradouro: text("localizacao_logradouro"),
		localizacaoNumero: text("localizacao_numero"),
		localizacaoComplemento: text("localizacao_complemento"),
		// Others
		canalAquisicao: text("canal_aquisicao"),
		primeiraCompraData: timestamp("primeira_compra_data"),
		primeiraCompraId: varchar("primeira_compra_id"),
		ultimaCompraData: timestamp("ultima_compra_data"),
		ultimaCompraId: varchar("ultima_compra_id"),
		// RFM
		analiseRFMTitulo: text("analise_rfm_titulo"),
		analiseRFMNotasRecencia: text("analise_rfm_notas_recencia"),
		analiseRFMNotasFrequencia: text("analise_rfm_notas_frequencia"),
		analiseRFMNotasMonetario: text("analise_rfm_notas_monetario"),
		analiseRFMUltimaAtualizacao: timestamp("analise_rfm_ultima_atualizacao"),
		analiseRFMUltimaAlteracao: timestamp("analise_rfm_ultima_alteracao"),

		dataNascimento: timestamp("data_nascimento"),
		dataInsercao: timestamp("data_insercao").defaultNow(),
	},
	(table) => ({
		// ...existing indices...
		nomeIndex: index("idx_clients_nome").using("gin", sql`to_tsvector('portuguese', ${table.nome})`),
		rfmTituloIdx: index("idx_clients_rfm_titulo").on(table.analiseRFMTitulo),
	}),
);
export const clientsRelations = relations(clients, ({ one, many }) => ({
	compras: many(sales),
	saldos: many(cashbackProgramBalances),
}));
export type TClientEntity = typeof clients.$inferSelect;
export type TNewClientEntity = typeof clients.$inferInsert;
