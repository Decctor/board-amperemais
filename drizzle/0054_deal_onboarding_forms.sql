-- Deal Onboarding Forms — formulário público de coleta de dados do deal.
-- Aplicável via `npm run db:push` (fluxo padrão do projeto) — este arquivo documenta o DDL.
-- Já aplicado manualmente em 2026-07-28 (db:push estava bloqueado por drift pré-existente
-- em ampmais_weekly_send_counters — prompt interativo sobre truncate; resolver com "No").
--
-- O admin emite um link público vinculado ao deal; o comprador preenche dados gerais +
-- uma seção por licença e é direcionado ao checkout Stripe do deal. Estrutura e respostas
-- em JSONB até a estrutura ser validada. "CONCLUIDO" não é status persistido — deriva de
-- deal.status = 'ATIVO'.

CREATE TYPE "deal_onboarding_form_status" AS ENUM ('EMITIDO', 'PREENCHIDO', 'CANCELADO');

CREATE TABLE "ampmais_deal_onboarding_forms" (
	"id" varchar(255) PRIMARY KEY,
	"deal_id" varchar(255) NOT NULL REFERENCES "ampmais_deals"("id") ON DELETE CASCADE,
	"status" "deal_onboarding_form_status" NOT NULL DEFAULT 'EMITIDO',
	-- Persistimos apenas o hash (sha256 hex); o token bruto aparece somente na emissão.
	"token_publico_hash" varchar(64) NOT NULL,
	"estrutura" jsonb NOT NULL,
	"respostas" jsonb,
	"data_expiracao" timestamp,
	"data_preenchimento" timestamp,
	"data_ultimo_rascunho" timestamp,
	"emitido_por_usuario_id" varchar(255) REFERENCES "ampmais_users"("id") ON DELETE SET NULL,
	"data_insercao" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "idx_deal_onboarding_forms_deal" ON "ampmais_deal_onboarding_forms" ("deal_id");
CREATE UNIQUE INDEX "idx_deal_onboarding_forms_token_hash" ON "ampmais_deal_onboarding_forms" ("token_publico_hash");
-- No máximo um formulário não-cancelado por deal; reemitir = cancelar o antigo + inserir novo.
CREATE UNIQUE INDEX "idx_deal_onboarding_forms_deal_ativo" ON "ampmais_deal_onboarding_forms" ("deal_id") WHERE status <> 'CANCELADO';
