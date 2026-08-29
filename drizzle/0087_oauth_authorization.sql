-- OAuth 2.1 para conexões MCP (Claude.ai, ChatGPT): clientes registrados dinamicamente
-- (RFC 7591) e códigos de autorização de uso único (authorization code + PKCE S256).
-- O token de acesso emitido é uma CHAVE_API comum sobre um principal — nenhuma mudança
-- nas tabelas de credenciais.
-- PRÉ-REQUISITO: drizzle/0085_agent_access_foundation.sql aplicado (tabelas de acesso).
-- PÓS-DEPLOY: npm run seed:access-clients (novo cliente de catálogo AGENT_MCP).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0087_oauth_authorization.sql
-- Idempotente (IF NOT EXISTS / DO-EXCEPTION nas constraints).

CREATE TABLE IF NOT EXISTS "ampmais_access_oauth_clients" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"access_client_id" varchar(255) NOT NULL,
	"nome" text NOT NULL,
	"redirect_uris" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_endpoint_auth_method" varchar(64) DEFAULT 'none' NOT NULL,
	"metadados_registro" jsonb,
	"status" "access_client_status" DEFAULT 'ATIVO' NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "ampmais_access_oauth_clients" ADD CONSTRAINT "ampmais_access_oauth_clients_access_client_id_fk"
		FOREIGN KEY ("access_client_id") REFERENCES "public"."ampmais_access_clients"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_access_oauth_clients_access_client_id" ON "ampmais_access_oauth_clients" ("access_client_id");

CREATE TABLE IF NOT EXISTS "ampmais_access_oauth_authorization_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"oauth_client_id" varchar(255) NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"usuario_id" varchar(255) NOT NULL,
	"hash_codigo" varchar(255) NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resource" text,
	"expira_em" timestamp NOT NULL,
	"data_consumo" timestamp,
	"principal_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "ampmais_access_oauth_authorization_codes" ADD CONSTRAINT "ampmais_access_oauth_authorization_codes_oauth_client_id_fk"
		FOREIGN KEY ("oauth_client_id") REFERENCES "public"."ampmais_access_oauth_clients"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	ALTER TABLE "ampmais_access_oauth_authorization_codes" ADD CONSTRAINT "ampmais_access_oauth_authorization_codes_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	ALTER TABLE "ampmais_access_oauth_authorization_codes" ADD CONSTRAINT "ampmais_access_oauth_authorization_codes_usuario_id_fk"
		FOREIGN KEY ("usuario_id") REFERENCES "public"."ampmais_users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
	ALTER TABLE "ampmais_access_oauth_authorization_codes" ADD CONSTRAINT "ampmais_access_oauth_authorization_codes_principal_id_fk"
		FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_access_oauth_codes_hash_codigo" ON "ampmais_access_oauth_authorization_codes" ("hash_codigo");
CREATE INDEX IF NOT EXISTS "idx_access_oauth_codes_organizacao_id" ON "ampmais_access_oauth_authorization_codes" ("organizacao_id");
