import type { TFileMetadata, TUploadConsumption, TUploadContext } from "@/schemas/files";
import { relations } from "drizzle-orm";
import { index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { fileVisibilityEnum, storageProviderEnum, uploadStatusEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Catálogo de arquivos: o registro durável de cada objeto armazenado. Entidades referenciam
 * `files.id` em vez de guardar caminho ou URL — esta tabela é o ÚNICO lugar do banco que sabe em
 * qual provedor/bucket/caminho os bytes vivem, o que torna a troca de fornecedor um job de fundo
 * (copiar, conferir `sha256`, atualizar a linha) em vez de uma migração de entidades.
 * Ver lib/files/README.md para a direção completa.
 */
export const files = newTable(
	"files",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),

		// Localização física
		provedor: storageProviderEnum("provedor").notNull().default("SUPABASE"),
		bucket: varchar("bucket", { length: 100 }).notNull(),
		caminho: text("caminho").notNull(),
		visibilidade: fileVisibilityEnum("visibilidade").notNull(),

		// Identidade do conteúdo — independente de onde os bytes estão.
		nomeOriginal: varchar("nome_original", { length: 255 }),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		tamanhoBytes: integer("tamanho_bytes").notNull(),
		sha256: varchar("sha256", { length: 64 }).notNull(),
		metadados: jsonb("metadados").$type<TFileMetadata>(),

		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("idx_files_provedor_bucket_caminho").on(table.provedor, table.bucket, table.caminho),
		index("idx_files_org_sha256").on(table.organizacaoId, table.sha256),
	],
);

/**
 * Transação de entrada de arquivo (upload em duas etapas): o cliente declara a intenção e recebe
 * uma URL same-origin + token; o PUT com os bytes valida o contrato de integridade
 * (`tamanho_esperado_bytes`, `sha256_esperado`) e materializa uma linha em `files`
 * (`arquivo_id`). A linha é o registro de auditoria de COMO os bytes entraram; o arquivo em si
 * vive em `files`. Propósito é varchar deliberadamente (mesma decisão do `tipo` de
 * action_approval_requests): novos propósitos entram pelo registro em lib/files/intake.ts sem
 * migração de enum.
 */
export const uploads = newTable(
	"uploads",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),

		// Classificação
		proposito: varchar("proposito", { length: 100 }).notNull(),
		status: uploadStatusEnum("status").notNull().default("AGUARDANDO"),

		// Credencial do PUT — hash sha256 do token, nunca o token em claro.
		tokenHash: varchar("token_hash", { length: 64 }).notNull(),

		// Contrato de integridade, declarado na criação e conferido no recebimento.
		nomeArquivo: varchar("nome_arquivo", { length: 255 }),
		tamanhoEsperadoBytes: integer("tamanho_esperado_bytes").notNull(),
		sha256Esperado: varchar("sha256_esperado", { length: 64 }),

		// Resultado — preenchido no recebimento.
		arquivoId: varchar("arquivo_id", { length: 255 }).references(() => files.id, { onDelete: "set null" }),

		// Atores
		criadoPorId: varchar("criado_por_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		contexto: jsonb("contexto").$type<TUploadContext>(),

		// Ciclo de vida
		dataExpiracao: timestamp("data_expiracao").notNull(),
		dataRecebimento: timestamp("data_recebimento"),
		dataConsumo: timestamp("data_consumo"),
		consumo: jsonb("consumo").$type<TUploadConsumption>(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("idx_uploads_token_hash").on(table.tokenHash),
		index("idx_uploads_org_status").on(table.organizacaoId, table.status),
		index("idx_uploads_data_expiracao").on(table.dataExpiracao),
	],
);

export const filesRelations = relations(files, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [files.organizacaoId],
		references: [organizations.id],
	}),
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [uploads.organizacaoId],
		references: [organizations.id],
	}),
	arquivo: one(files, {
		fields: [uploads.arquivoId],
		references: [files.id],
	}),
	criadoPor: one(users, {
		fields: [uploads.criadoPorId],
		references: [users.id],
	}),
}));

export type TFileEntity = typeof files.$inferSelect;
export type TNewFileEntity = typeof files.$inferInsert;
export type TUploadEntity = typeof uploads.$inferSelect;
export type TNewUploadEntity = typeof uploads.$inferInsert;
