-- Jornadas de onboarding por organização e produto (CRM, ERP).
--
-- Substitui o cookie `onboarding_stage` como fonte de verdade da retomada: a etapa passa a
-- pertencer à organização, sobrevive a troca de dispositivo e a retornos de OAuth. A linha
-- guarda navegação e respostas; o que está configurado é derivado das tabelas reais
-- (lib/onboarding/readiness.ts). `organizations.data_onboarding_conclusao` segue como gate do
-- /dashboard e é carimbada quando a primeira jornada conclui.
-- Plano: docs/onboarding/onboarding-crm-erp-technical-and-visual-design.md §2.1.
--
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0099_organization_onboardings.sql
-- Idempotente (IF NOT EXISTS / DO $$ ... $$).

DO $$ BEGIN
	CREATE TYPE "onboarding_product" AS ENUM ('CRM', 'ERP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
	CREATE TYPE "onboarding_intent_origin" AS ENUM ('LINK', 'PARCEIRO', 'DEAL', 'PERGUNTA', 'SEGUNDO_PRODUTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ampmais_organization_onboardings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE CASCADE,
	"produto" "onboarding_product" NOT NULL,
	"origem_intencao" "onboarding_intent_origin" NOT NULL,
	"etapa_atual" varchar(64) NOT NULL,
	"etapas_adiadas" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"etapas_visitadas" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"respostas" jsonb NOT NULL,
	"data_inicio" timestamp NOT NULL DEFAULT now(),
	"data_conclusao" timestamp,
	"autor_id" varchar(255) REFERENCES "ampmais_users"("id") ON DELETE SET NULL,
	"data_atualizacao" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_organization_onboardings_org_produto_unique"
	ON "ampmais_organization_onboardings" ("organizacao_id", "produto");

-- Server-side Drizzle access only; organization authorization is enforced by the app.
ALTER TABLE "ampmais_organization_onboardings" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "ampmais_organization_onboardings" IS
	'Progresso da jornada de ativação por organização e produto. Navegação e respostas; prontidão é derivada.';
