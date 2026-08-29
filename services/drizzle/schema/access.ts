// Fundação de acesso externo: software externo (tablets POI, agentes, service accounts)
// acessando o RecompraCRM — chamadas de ENTRADA. Não confundir com `integrations`, que
// guarda credenciais para chamadas de SAÍDA (Meta, Bling, iFood…).
// Modelo e decisões: docs/dev-planning/poi-mobile-react-native-plan.md §9.
import { relations } from "drizzle-orm";
import { type AnyPgColumn, boolean, index, integer, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import {
	accessClientCategoryEnum,
	accessClientStatusEnum,
	accessCredentialTypeEnum,
	accessPrincipalStatusEnum,
	accessPrincipalTypeEnum,
} from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

export const accessClients = newTable("access_clients", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	codigo: varchar("codigo", { length: 255 }).notNull().unique(),
	nome: text("nome").notNull(),
	categoria: accessClientCategoryEnum("categoria").notNull(),
	nativo: boolean("nativo").notNull().default(false),
	// Teto de scopes: nenhum grant de um principal deste cliente pode exceder este conjunto.
	escoposPermitidos: jsonb("escopos_permitidos").$type<string[]>().notNull().default([]),
	status: accessClientStatusEnum("status").notNull().default("ATIVO"),
	configuracao: jsonb("configuracao"),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
});

export const accessPrincipals = newTable(
	"access_principals",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		accessClientId: varchar("access_client_id", { length: 255 })
			.references(() => accessClients.id, { onDelete: "cascade" })
			.notNull(),
		// Nulo SOMENTE para `tipo = "CONTA_PLATAFORMA"` — garantido por CHECK constraint no banco
		// (`chk_access_principals_organizacao`). Para todo o resto continua valendo o modelo de
		// instalação: cliente autorizado por N organizações = N principals.
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "cascade" }),
		// Sem FK enquanto lojas não forem entidade do schema; coluna própria porque vínculo com loja
		// participa de política e relatório (não vai para JSON).
		lojaId: varchar("loja_id", { length: 255 }),
		// Humano que assume a responsabilidade pelas mutações feitas por esta conexão MCP. O
		// principal continua sendo o ator real na auditoria.
		responsavelUsuarioId: varchar("responsavel_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		tipo: accessPrincipalTypeEnum("tipo").notNull(),
		nome: text("nome").notNull(),
		referenciaExterna: varchar("referencia_externa", { length: 255 }),
		status: accessPrincipalStatusEnum("status").notNull().default("ATIVO"),
		metadados: jsonb("metadados").$type<Record<string, unknown>>(),
		ultimoAcesso: timestamp("ultimo_acesso"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
		dataRevogacao: timestamp("data_revogacao"),
	},
	(table) => ({
		organizacaoIdIdx: index("idx_access_principals_organizacao_id").on(table.organizacaoId),
		accessClientIdIdx: index("idx_access_principals_access_client_id").on(table.accessClientId),
		responsavelUsuarioIdIdx: index("idx_access_principals_responsavel_usuario_id").on(table.responsavelUsuarioId),
	}),
);

export const accessCredentials = newTable(
	"access_credentials",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		principalId: varchar("principal_id", { length: 255 })
			.references(() => accessPrincipals.id, { onDelete: "cascade" })
			.notNull(),
		tipo: accessCredentialTypeEnum("tipo").notNull(),
		// Localiza a credencial sem varrer hashes; viaja em claro dentro do token.
		idPublico: varchar("id_publico", { length: 255 }).notNull(),
		prefixoExibicao: varchar("prefixo_exibicao", { length: 255 }).notNull(),
		// SHA-256 do segredo aleatório (≥256 bits). Nunca bcrypt/argon2 — segredo de alta entropia
		// gerado pela plataforma; hash barato é o que viabiliza verificação em toda requisição.
		hashSegredo: varchar("hash_segredo", { length: 255 }).notNull(),
		descricao: text("descricao"),
		expiraEm: timestamp("expira_em"),
		ultimoUso: timestamp("ultimo_uso"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataRevogacao: timestamp("data_revogacao"),
		substituidaPorId: varchar("substituida_por_id", { length: 255 }).references((): AnyPgColumn => accessCredentials.id, { onDelete: "set null" }),
	},
	(table) => ({
		idPublicoIdx: uniqueIndex("idx_access_credentials_id_publico").on(table.idPublico),
		principalIdIdx: index("idx_access_credentials_principal_id").on(table.principalId),
	}),
);

export const accessGrants = newTable(
	"access_grants",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		principalId: varchar("principal_id", { length: 255 })
			.references(() => accessPrincipals.id, { onDelete: "cascade" })
			.notNull(),
		// Correspondência por igualdade exata — sem wildcards (plan §9.4).
		scope: varchar("scope", { length: 255 }).notNull(),
		// Reservado a limites genuinamente ad-hoc (ex.: valor máximo de operação). Loja tem coluna no principal.
		restricoes: jsonb("restricoes"),
		concedidoPorId: varchar("concedido_por_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataRevogacao: timestamp("data_revogacao"),
	},
	(table) => ({
		// Re-concessão limpa data_revogacao em vez de criar linha nova.
		principalScopeIdx: uniqueIndex("idx_access_grants_principal_scope").on(table.principalId, table.scope),
	}),
);

export const accessEnrollmentChallenges = newTable(
	"access_enrollment_challenges",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		accessClientId: varchar("access_client_id", { length: 255 })
			.references(() => accessClients.id, { onDelete: "cascade" })
			.notNull(),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		// SHA-256 do código normalizado; lookup por igualdade exata.
		hashCodigo: varchar("hash_codigo", { length: 255 }).notNull(),
		nomeSugerido: text("nome_sugerido"),
		escoposSolicitados: jsonb("escopos_solicitados").$type<string[]>().notNull().default([]),
		expiraEm: timestamp("expira_em").notNull(),
		maximoUsos: integer("maximo_usos").notNull().default(1),
		quantidadeUsos: integer("quantidade_usos").notNull().default(0),
		criadoPorId: varchar("criado_por_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataConsumo: timestamp("data_consumo"),
	},
	(table) => ({
		hashCodigoIdx: uniqueIndex("idx_access_enrollment_challenges_hash_codigo").on(table.hashCodigo),
		organizacaoIdIdx: index("idx_access_enrollment_challenges_organizacao_id").on(table.organizacaoId),
	}),
);

// Cliente OAuth registrado dinamicamente (RFC 7591) por um conector MCP (Claude, ChatGPT…).
// Não confundir com `accessClients` (catálogo de aplicações): o registro OAuth é a instância
// concreta que um conector criou, e aponta para a aplicação do catálogo que lhe dá o teto de
// scopes. O `id` é o próprio `client_id` OAuth — opaco e sem segredo (cliente público + PKCE).
export const accessOauthClients = newTable(
	"access_oauth_clients",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		accessClientId: varchar("access_client_id", { length: 255 })
			.references(() => accessClients.id, { onDelete: "cascade" })
			.notNull(),
		nome: text("nome").notNull(),
		redirectUris: jsonb("redirect_uris").$type<string[]>().notNull().default([]),
		// Sempre "none" hoje. A coluna existe para clientes confidenciais futuros não custarem migração.
		tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 64 }).notNull().default("none"),
		// Payload de registro sanitizado, para diagnóstico — nunca decisões de autorização.
		metadadosRegistro: jsonb("metadados_registro"),
		status: accessClientStatusEnum("status").notNull().default("ATIVO"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
	},
	(table) => ({
		accessClientIdIdx: index("idx_access_oauth_clients_access_client_id").on(table.accessClientId),
	}),
);

// Código de autorização de curta duração (authorization code + PKCE), de uso único.
// Como toda credencial deste módulo, só o SHA-256 do código fica no banco.
export const accessOauthAuthorizationCodes = newTable(
	"access_oauth_authorization_codes",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		oauthClientId: varchar("oauth_client_id", { length: 255 })
			.references(() => accessOauthClients.id, { onDelete: "cascade" })
			.notNull(),
		// Nulo = consentimento de plataforma feito por um admin (`user.admin`): a troca provisiona
		// um principal CONTA_PLATAFORMA. Mesmo racional do organizacao_id nulo em access_principals.
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "cascade" }),
		usuarioId: varchar("usuario_id", { length: 255 })
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		hashCodigo: varchar("hash_codigo", { length: 255 }).notNull(),
		// A URI exata usada no /authorize: a troca no /token precisa repeti-la (RFC 6749 §4.1.3).
		redirectUri: text("redirect_uri").notNull(),
		// Challenge S256 em base64url — único método aceito; "plain" é recusado no endpoint.
		codeChallenge: varchar("code_challenge", { length: 255 }).notNull(),
		scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
		// RFC 8707, quando o cliente informa. Guardado para auditoria; validado contra o endpoint MCP.
		resource: text("resource"),
		expiraEm: timestamp("expira_em").notNull(),
		dataConsumo: timestamp("data_consumo"),
		// Preenchido na troca: qual principal nasceu deste consentimento.
		principalId: varchar("principal_id", { length: 255 }).references(() => accessPrincipals.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		hashCodigoIdx: uniqueIndex("idx_access_oauth_codes_hash_codigo").on(table.hashCodigo),
		organizacaoIdIdx: index("idx_access_oauth_codes_organizacao_id").on(table.organizacaoId),
	}),
);

export const accessEvents = newTable(
	"access_events",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		// Nullable: falhas de enrollment/autenticação podem não ter organização nem principal conhecidos.
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "cascade" }),
		principalId: varchar("principal_id", { length: 255 }).references(() => accessPrincipals.id, { onDelete: "set null" }),
		credencialId: varchar("credencial_id", { length: 255 }).references(() => accessCredentials.id, { onDelete: "set null" }),
		tipo: varchar("tipo", { length: 64 }).notNull(),
		enderecoIp: varchar("endereco_ip", { length: 64 }),
		userAgent: text("user_agent"),
		metadados: jsonb("metadados"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		organizacaoDataIdx: index("idx_access_events_organizacao_data").on(table.organizacaoId, table.dataInsercao),
		// Sustenta o rate limiting por IP do enrollment (contagem de falhas recentes).
		tipoIpDataIdx: index("idx_access_events_tipo_ip_data").on(table.tipo, table.enderecoIp, table.dataInsercao),
	}),
);

export const accessClientsRelations = relations(accessClients, ({ many }) => ({
	principals: many(accessPrincipals),
	enrollmentChallenges: many(accessEnrollmentChallenges),
}));

export const accessPrincipalsRelations = relations(accessPrincipals, ({ one, many }) => ({
	cliente: one(accessClients, {
		fields: [accessPrincipals.accessClientId],
		references: [accessClients.id],
	}),
	organizacao: one(organizations, {
		fields: [accessPrincipals.organizacaoId],
		references: [organizations.id],
	}),
	responsavelUsuario: one(users, {
		fields: [accessPrincipals.responsavelUsuarioId],
		references: [users.id],
	}),
	credenciais: many(accessCredentials),
	grants: many(accessGrants),
}));

export const accessCredentialsRelations = relations(accessCredentials, ({ one }) => ({
	principal: one(accessPrincipals, {
		fields: [accessCredentials.principalId],
		references: [accessPrincipals.id],
	}),
	substituidaPor: one(accessCredentials, {
		fields: [accessCredentials.substituidaPorId],
		references: [accessCredentials.id],
	}),
}));

export const accessGrantsRelations = relations(accessGrants, ({ one }) => ({
	principal: one(accessPrincipals, {
		fields: [accessGrants.principalId],
		references: [accessPrincipals.id],
	}),
	concedidoPor: one(users, {
		fields: [accessGrants.concedidoPorId],
		references: [users.id],
	}),
}));

export const accessEnrollmentChallengesRelations = relations(accessEnrollmentChallenges, ({ one }) => ({
	cliente: one(accessClients, {
		fields: [accessEnrollmentChallenges.accessClientId],
		references: [accessClients.id],
	}),
	organizacao: one(organizations, {
		fields: [accessEnrollmentChallenges.organizacaoId],
		references: [organizations.id],
	}),
	criadoPor: one(users, {
		fields: [accessEnrollmentChallenges.criadoPorId],
		references: [users.id],
	}),
}));

export const accessOauthClientsRelations = relations(accessOauthClients, ({ one, many }) => ({
	cliente: one(accessClients, {
		fields: [accessOauthClients.accessClientId],
		references: [accessClients.id],
	}),
	authorizationCodes: many(accessOauthAuthorizationCodes),
}));

export const accessOauthAuthorizationCodesRelations = relations(accessOauthAuthorizationCodes, ({ one }) => ({
	oauthClient: one(accessOauthClients, {
		fields: [accessOauthAuthorizationCodes.oauthClientId],
		references: [accessOauthClients.id],
	}),
	organizacao: one(organizations, {
		fields: [accessOauthAuthorizationCodes.organizacaoId],
		references: [organizations.id],
	}),
	usuario: one(users, {
		fields: [accessOauthAuthorizationCodes.usuarioId],
		references: [users.id],
	}),
	principal: one(accessPrincipals, {
		fields: [accessOauthAuthorizationCodes.principalId],
		references: [accessPrincipals.id],
	}),
}));

export const accessEventsRelations = relations(accessEvents, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [accessEvents.organizacaoId],
		references: [organizations.id],
	}),
	principal: one(accessPrincipals, {
		fields: [accessEvents.principalId],
		references: [accessPrincipals.id],
	}),
	credencial: one(accessCredentials, {
		fields: [accessEvents.credencialId],
		references: [accessCredentials.id],
	}),
}));

export type TAccessClientEntity = typeof accessClients.$inferSelect;
export type TNewAccessClientEntity = typeof accessClients.$inferInsert;
export type TAccessPrincipalEntity = typeof accessPrincipals.$inferSelect;
export type TNewAccessPrincipalEntity = typeof accessPrincipals.$inferInsert;
export type TAccessCredentialEntity = typeof accessCredentials.$inferSelect;
export type TNewAccessCredentialEntity = typeof accessCredentials.$inferInsert;
export type TAccessGrantEntity = typeof accessGrants.$inferSelect;
export type TNewAccessGrantEntity = typeof accessGrants.$inferInsert;
export type TAccessEnrollmentChallengeEntity = typeof accessEnrollmentChallenges.$inferSelect;
export type TNewAccessEnrollmentChallengeEntity = typeof accessEnrollmentChallenges.$inferInsert;
export type TAccessEventEntity = typeof accessEvents.$inferSelect;
export type TNewAccessEventEntity = typeof accessEvents.$inferInsert;
export type TAccessOauthClientEntity = typeof accessOauthClients.$inferSelect;
export type TNewAccessOauthClientEntity = typeof accessOauthClients.$inferInsert;
export type TAccessOauthAuthorizationCodeEntity = typeof accessOauthAuthorizationCodes.$inferSelect;
export type TNewAccessOauthAuthorizationCodeEntity = typeof accessOauthAuthorizationCodes.$inferInsert;
