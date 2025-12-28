import type { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable, organizationIntegrationTypeEnum } from ".";

export const organizations = newTable("organizations", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	nome: text("nome").notNull(),
	cnpj: text("cnpj").notNull(),
	logoUrl: text("logo_url"),
	telefone: text("telefone"),
	email: text("email"),
	localizacaoCep: text("localizacao_cep"),
	localizacaoEstado: text("localizacao_estado"),
	localizacaoCidade: text("localizacao_cidade"),
	localizacaoBairro: text("localizacao_bairro"),
	localizacaoLogradouro: text("localizacao_logradouro"),
	localizacaoNumero: text("localizacao_numero"),
	localizacaoComplemento: text("localizacao_complemento"),
	integracaoTipo: organizationIntegrationTypeEnum("integracao_tipo"),
	integracaoConfiguracao: jsonb("integracao_configuracao").$type<TOrganizationIntegrationConfig>(),
	integracaoDataUltimaSincronizacao: timestamp("integracao_data_ultima_sincronizacao"),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
