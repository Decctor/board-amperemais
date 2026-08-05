import type { TCustomFieldOption, TCustomFieldValue } from "@/schemas/custom-fields";
import { relations, sql } from "drizzle-orm";
import { boolean, index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { newTable } from "./common";
import { customFieldEntityEnum, customFieldTypeEnum } from "./enums";
import { organizations } from "./organizations";

/**
 * Definição de um campo extra que a organização coleta. A definição é genérica por `entidade`
 * (hoje só CLIENTE); o valor é concreto por entidade (ver `clientCustomFieldValues`), porque um
 * `entidadeId` genérico não teria FK real e deixaria valores órfãos ao apagar o dono.
 *
 * `chaveNativa` distingue os dois tipos de campo:
 * — não nula: campo do catálogo de fábrica (`lib/custom-fields/native-catalog.ts`), que a
 *   plataforma entende semanticamente (segmentação pronta, write-through para colunas reais);
 * — nula: campo criado pela organização, que a plataforma armazena mas não interpreta.
 */
export const customFields = newTable(
	"custom_fields",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		entidade: customFieldEntityEnum("entidade").notNull().default("CLIENTE"),
		chaveNativa: text("chave_nativa"),
		titulo: text("titulo").notNull(),
		descricao: text("descricao"),
		tipo: customFieldTypeEnum("tipo").notNull(),
		opcoes: jsonb("opcoes").$type<TCustomFieldOption[]>(),
		ativo: boolean("ativo").notNull().default(true),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
	},
	(table) => [
		index("idx_custom_fields_organizacao_entidade").on(table.organizacaoId, table.entidade),
		// Um campo nativo existe no máximo uma vez por organização. Parcial porque `chave_nativa`
		// é nula nos campos próprios da organização, e no Postgres NULL nunca conflita — deixar
		// explícito evita a falsa impressão de que campos próprios estão sob a mesma restrição.
		uniqueIndex("idx_custom_fields_organizacao_chave_nativa")
			.on(table.organizacaoId, table.chaveNativa)
			.where(sql`${table.chaveNativa} is not null`),
	],
);
export const customFieldRelations = relations(customFields, ({ one, many }) => ({
	organizacao: one(organizations, {
		fields: [customFields.organizacaoId],
		references: [organizations.id],
	}),
	valoresCliente: many(clientCustomFieldValues),
}));
export type TCustomFieldEntity = typeof customFields.$inferSelect;
export type TNewCustomFieldEntity = typeof customFields.$inferInsert;

/**
 * Valor de um campo personalizado para um cliente. O formato de `valor` é ditado pelo `tipo` da
 * definição — a validação cruzada mora em `saveClientCustomFieldValues`, único ponto de escrita.
 *
 * Campos nativos com write-through (data de nascimento, e-mail) NÃO geram linha aqui: eles são
 * gravados na coluna real de `clients`, para que a fonte da verdade continue única.
 */
export const clientCustomFieldValues = newTable(
	"client_custom_field_values",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		clienteId: varchar("cliente_id", { length: 255 })
			.references(() => clients.id, { onDelete: "cascade" })
			.notNull(),
		campoId: varchar("campo_id", { length: 255 })
			.references(() => customFields.id, { onDelete: "cascade" })
			.notNull(),
		valor: jsonb("valor").$type<TCustomFieldValue>().notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
	},
	(table) => [
		// Chave natural: um cliente tem no máximo um valor por campo. É o alvo do upsert.
		uniqueIndex("idx_client_custom_field_values_cliente_campo").on(table.clienteId, table.campoId),
		// Segmentação: "clientes da organização cujo campo X vale Y" varre por (org, campo).
		index("idx_client_custom_field_values_organizacao_campo").on(table.organizacaoId, table.campoId),
	],
);
export const clientCustomFieldValueRelations = relations(clientCustomFieldValues, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [clientCustomFieldValues.organizacaoId],
		references: [organizations.id],
	}),
	cliente: one(clients, {
		fields: [clientCustomFieldValues.clienteId],
		references: [clients.id],
	}),
	campo: one(customFields, {
		fields: [clientCustomFieldValues.campoId],
		references: [customFields.id],
	}),
}));
export type TClientCustomFieldValueEntity = typeof clientCustomFieldValues.$inferSelect;
export type TNewClientCustomFieldValueEntity = typeof clientCustomFieldValues.$inferInsert;
