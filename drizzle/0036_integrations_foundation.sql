-- Fundação de integrations (marketing/parceiros — Meta Ads, CAPI, etc.).
-- Aditiva: NÃO substitui a integração de ERP/fonte de dados, que segue inline em
-- ampmais_organizations (integracao_tipo / integracao_configuracao).
-- A permissão "integracoes" é armazenada no JSONB de permissões dos membros — sem DDL.

-- 1. Enums da fundação.
CREATE TYPE "public"."integration_type" AS ENUM('META_ADS', 'META_CAPI', 'TRACKING');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('CONECTADO', 'EXPIRADO', 'ERRO');--> statement-breakpoint

-- 2. integrations: uma linha = uma conexão concreta (ex.: uma conta de anúncios da Meta).
CREATE TABLE "ampmais_integrations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"tipo" "public"."integration_type" NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"apelido" text,
	"ref_externo" varchar(255),
	"configuracao" jsonb,
	"status" "public"."integration_status" DEFAULT 'CONECTADO' NOT NULL,
	"ultimo_erro" text,
	"data_ultima_sincronizacao" timestamp,
	"autor_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);--> statement-breakpoint

-- 3. FKs.
ALTER TABLE "ampmais_integrations" ADD CONSTRAINT "ampmais_integrations_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_integrations" ADD CONSTRAINT "ampmais_integrations_autor_id_ampmais_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 4. Índices: busca por (organização, tipo) e unicidade por conexão externa.
CREATE INDEX "idx_integrations_org_tipo" ON "ampmais_integrations" USING btree ("organizacao_id","tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_integrations_org_tipo_ref_unique" ON "ampmais_integrations" USING btree ("organizacao_id","tipo","ref_externo");
