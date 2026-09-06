-- Chave do preset que originou uma campanha.
--
-- O onboarding semeia campanhas a partir de presets e precisa reconhecê-las depois (upsert na
-- retomada, reconciliação de envios) sem depender do título, que o usuário pode renomear. O nome
-- é genérico de propósito: a futura biblioteca de campanhas usa o mesmo conceito. Null =
-- campanha criada manualmente.
-- Plano: docs/onboarding/onboarding-crm-erp-technical-and-visual-design.md §2.3.
--
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0100_campaigns_chave_preset.sql
-- Idempotente (IF NOT EXISTS). O backfill reconhece as campanhas semeadas pelo onboarding atual
-- pelos títulos fixos dos presets.

ALTER TABLE "ampmais_campaigns"
	ADD COLUMN IF NOT EXISTS "chave_preset" varchar(64);

CREATE INDEX IF NOT EXISTS "idx_campaigns_org_chave_preset"
	ON "ampmais_campaigns" ("organizacao_id", "chave_preset");

UPDATE "ampmais_campaigns" SET "chave_preset" = 'primeira-compra'
	WHERE "chave_preset" IS NULL AND "titulo" = 'Campanha Primeira Compra (RecompraCRM)';
UPDATE "ampmais_campaigns" SET "chave_preset" = 'segunda-compra'
	WHERE "chave_preset" IS NULL AND "titulo" = 'Campanha Segunda Compra (RecompraCRM)';
UPDATE "ampmais_campaigns" SET "chave_preset" = 'aniversario'
	WHERE "chave_preset" IS NULL AND "titulo" = 'Campanha Presente de Aniversário (RecompraCRM)';
UPDATE "ampmais_campaigns" SET "chave_preset" = 'recuperacao'
	WHERE "chave_preset" IS NULL AND "titulo" = 'Campanha Recuperação de Clientes (RecompraCRM)';
UPDATE "ampmais_campaigns" SET "chave_preset" = 'cashback-expirando'
	WHERE "chave_preset" IS NULL AND "titulo" = 'Campanha Cashback Expirando (RecompraCRM)';

COMMENT ON COLUMN "ampmais_campaigns"."chave_preset" IS
	'Chave do preset de origem (onboarding, biblioteca). Null = criada manualmente.';
