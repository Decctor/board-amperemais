-- Fundação de acesso externo (docs/dev-planning/poi-mobile-react-native-plan.md §9):
-- software externo (tablets POI, agentes, service accounts) acessando o RecompraCRM.
-- Chamadas de ENTRADA — não confundir com `integrations` (credenciais de SAÍDA).

-- 1. Enums.
CREATE TYPE "public"."access_client_category" AS ENUM('NATIVO_MOBILE', 'NATIVO_WEB_KIOSK', 'NATIVO_DESKTOP', 'TERMINAL_PAGAMENTO', 'SERVIDOR_EXTERNO', 'APLICACAO_PARCEIRA');--> statement-breakpoint
CREATE TYPE "public"."access_client_status" AS ENUM('ATIVO', 'INATIVO');--> statement-breakpoint
CREATE TYPE "public"."access_principal_type" AS ENUM('DISPOSITIVO', 'AGENTE_DESKTOP', 'CONTA_SERVICO');--> statement-breakpoint
CREATE TYPE "public"."access_principal_status" AS ENUM('ATIVO', 'INATIVO', 'REVOGADO');--> statement-breakpoint
CREATE TYPE "public"."access_credential_type" AS ENUM('TOKEN_DISPOSITIVO', 'CHAVE_API');--> statement-breakpoint

-- 2. access_clients: a aplicação conhecida pela plataforma (não a instalação concreta).
-- escopos_permitidos é o teto: nenhum grant de um principal deste cliente pode excedê-lo.
CREATE TABLE "ampmais_access_clients" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"codigo" varchar(255) NOT NULL,
	"nome" text NOT NULL,
	"categoria" "public"."access_client_category" NOT NULL,
	"nativo" boolean DEFAULT false NOT NULL,
	"escopos_permitidos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "public"."access_client_status" DEFAULT 'ATIVO' NOT NULL,
	"configuracao" jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_access_clients_codigo_unique" UNIQUE("codigo")
);--> statement-breakpoint

-- 3. access_principals: o ator concreto (tablet, agente, conta de serviço), sempre single-tenant.
-- loja_id sem FK enquanto lojas não forem entidade do schema.
CREATE TABLE "ampmais_access_principals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"access_client_id" varchar(255) NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"loja_id" varchar(255),
	"tipo" "public"."access_principal_type" NOT NULL,
	"nome" text NOT NULL,
	"referencia_externa" varchar(255),
	"status" "public"."access_principal_status" DEFAULT 'ATIVO' NOT NULL,
	"metadados" jsonb,
	"ultimo_acesso" timestamp,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	"data_revogacao" timestamp
);--> statement-breakpoint
ALTER TABLE "ampmais_access_principals" ADD CONSTRAINT "ampmais_access_principals_access_client_id_fk" FOREIGN KEY ("access_client_id") REFERENCES "public"."ampmais_access_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_principals" ADD CONSTRAINT "ampmais_access_principals_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_access_principals_organizacao_id" ON "ampmais_access_principals" ("organizacao_id");--> statement-breakpoint
CREATE INDEX "idx_access_principals_access_client_id" ON "ampmais_access_principals" ("access_client_id");--> statement-breakpoint

-- 4. access_credentials: ciclo de vida independente do principal (rotação com sobreposição).
-- hash_segredo = SHA-256 do segredo aleatório (≥256 bits); id_publico localiza sem varrer hashes.
CREATE TABLE "ampmais_access_credentials" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"principal_id" varchar(255) NOT NULL,
	"tipo" "public"."access_credential_type" NOT NULL,
	"id_publico" varchar(255) NOT NULL,
	"prefixo_exibicao" varchar(255) NOT NULL,
	"hash_segredo" varchar(255) NOT NULL,
	"descricao" text,
	"expira_em" timestamp,
	"ultimo_uso" timestamp,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_revogacao" timestamp,
	"substituida_por_id" varchar(255)
);--> statement-breakpoint
ALTER TABLE "ampmais_access_credentials" ADD CONSTRAINT "ampmais_access_credentials_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_credentials" ADD CONSTRAINT "ampmais_access_credentials_substituida_por_id_fk" FOREIGN KEY ("substituida_por_id") REFERENCES "public"."ampmais_access_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_access_credentials_id_publico" ON "ampmais_access_credentials" ("id_publico");--> statement-breakpoint
CREATE INDEX "idx_access_credentials_principal_id" ON "ampmais_access_credentials" ("principal_id");--> statement-breakpoint

-- 5. access_grants: scopes concedidos explicitamente (igualdade exata, sem wildcards).
-- Unicidade (principal, scope): re-concessão limpa data_revogacao em vez de criar linha nova.
CREATE TABLE "ampmais_access_grants" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"principal_id" varchar(255) NOT NULL,
	"scope" varchar(255) NOT NULL,
	"restricoes" jsonb,
	"concedido_por_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_revogacao" timestamp
);--> statement-breakpoint
ALTER TABLE "ampmais_access_grants" ADD CONSTRAINT "ampmais_access_grants_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_grants" ADD CONSTRAINT "ampmais_access_grants_concedido_por_id_fk" FOREIGN KEY ("concedido_por_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_access_grants_principal_scope" ON "ampmais_access_grants" ("principal_id", "scope");--> statement-breakpoint

-- 6. access_enrollment_challenges: desafio temporário de ativação (não é credencial permanente).
CREATE TABLE "ampmais_access_enrollment_challenges" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"access_client_id" varchar(255) NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"hash_codigo" varchar(255) NOT NULL,
	"nome_sugerido" text,
	"escopos_solicitados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expira_em" timestamp NOT NULL,
	"maximo_usos" integer DEFAULT 1 NOT NULL,
	"quantidade_usos" integer DEFAULT 0 NOT NULL,
	"criado_por_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_consumo" timestamp
);--> statement-breakpoint
ALTER TABLE "ampmais_access_enrollment_challenges" ADD CONSTRAINT "ampmais_access_enrollment_challenges_access_client_id_fk" FOREIGN KEY ("access_client_id") REFERENCES "public"."ampmais_access_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_enrollment_challenges" ADD CONSTRAINT "ampmais_access_enrollment_challenges_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_enrollment_challenges" ADD CONSTRAINT "ampmais_access_enrollment_challenges_criado_por_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_access_enrollment_challenges_hash_codigo" ON "ampmais_access_enrollment_challenges" ("hash_codigo");--> statement-breakpoint
CREATE INDEX "idx_access_enrollment_challenges_organizacao_id" ON "ampmais_access_enrollment_challenges" ("organizacao_id");--> statement-breakpoint

-- 7. access_events: auditoria de segurança/gestão. organizacao_id/principal_id nullable de
-- propósito (falhas de enrollment/autenticação podem não ter organização nem principal).
-- O índice (tipo, endereco_ip, data_insercao) sustenta o rate limiting do enrollment.
CREATE TABLE "ampmais_access_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255),
	"principal_id" varchar(255),
	"credencial_id" varchar(255),
	"tipo" varchar(64) NOT NULL,
	"endereco_ip" varchar(64),
	"user_agent" text,
	"metadados" jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ampmais_access_events" ADD CONSTRAINT "ampmais_access_events_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_events" ADD CONSTRAINT "ampmais_access_events_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_access_events" ADD CONSTRAINT "ampmais_access_events_credencial_id_fk" FOREIGN KEY ("credencial_id") REFERENCES "public"."ampmais_access_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_access_events_organizacao_data" ON "ampmais_access_events" ("organizacao_id", "data_insercao");--> statement-breakpoint
CREATE INDEX "idx_access_events_tipo_ip_data" ON "ampmais_access_events" ("tipo", "endereco_ip", "data_insercao");
