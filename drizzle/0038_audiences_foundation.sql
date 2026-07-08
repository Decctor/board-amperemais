-- Audiences (públicos): definição de segmento agnóstica de plataforma (reusa o motor de filtros das
-- campanhas), com destinos externos (Custom Audience na Meta) e membros já enviados (hashes p/ delta
-- e remoção — inclusive propagação de exclusão/LGPD).

-- 1. Enum de status do destino.
CREATE TYPE "public"."audience_destination_status" AS ENUM('PENDENTE', 'SINCRONIZADO', 'ERRO');--> statement-breakpoint

-- 2. audiences: o público em si (agnóstico de plataforma).
CREATE TABLE "ampmais_audiences" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"filtros" jsonb,
	"segmentacoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"autor_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);--> statement-breakpoint

-- 3. audience_destinations: ligação do público a uma integração + id externo + estatísticas.
CREATE TABLE "ampmais_audience_destinations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"audiencia_id" varchar(255) NOT NULL,
	"integracao_id" varchar(255) NOT NULL,
	"external_id" varchar(255),
	"status" "public"."audience_destination_status" DEFAULT 'PENDENTE' NOT NULL,
	"match_rate" double precision,
	"qtde_enviada" integer DEFAULT 0 NOT NULL,
	"ultima_sincronizacao" timestamp,
	"ultimo_erro" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);--> statement-breakpoint

-- 4. audience_destination_members: membros enviados com hashes (delta + remoção pós-exclusão).
CREATE TABLE "ampmais_audience_destination_members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"destino_id" varchar(255) NOT NULL,
	"cliente_id" varchar(255) NOT NULL,
	"email_hash" varchar(64),
	"telefone_hash" varchar(64),
	"data_insercao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 5. FKs.
ALTER TABLE "ampmais_audiences" ADD CONSTRAINT "ampmais_audiences_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_audiences" ADD CONSTRAINT "ampmais_audiences_autor_id_ampmais_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_audience_destinations" ADD CONSTRAINT "ampmais_audience_destinations_audiencia_id_ampmais_audiences_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."ampmais_audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_audience_destinations" ADD CONSTRAINT "ampmais_audience_destinations_integracao_id_ampmais_integrations_id_fk" FOREIGN KEY ("integracao_id") REFERENCES "public"."ampmais_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_audience_destination_members" ADD CONSTRAINT "ampmais_audience_destination_members_destino_id_ampmais_audience_destinations_id_fk" FOREIGN KEY ("destino_id") REFERENCES "public"."ampmais_audience_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 6. Índices.
CREATE UNIQUE INDEX "idx_audience_destinations_audiencia_integracao_unique" ON "ampmais_audience_destinations" USING btree ("audiencia_id","integracao_id");--> statement-breakpoint
CREATE INDEX "idx_audience_destinations_integracao" ON "ampmais_audience_destinations" USING btree ("integracao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_audience_destination_members_destino_cliente_unique" ON "ampmais_audience_destination_members" USING btree ("destino_id","cliente_id");--> statement-breakpoint
CREATE INDEX "idx_audience_destination_members_destino" ON "ampmais_audience_destination_members" USING btree ("destino_id");
