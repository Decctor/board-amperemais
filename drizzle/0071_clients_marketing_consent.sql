-- Consentimento explícito de marketing no cadastro do cliente (LGPD).
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0071_clients_marketing_consent.sql
-- Idempotente.
--
-- A coluna guarda a DATA do aceite, não um booleano: o que a LGPD exige provar é quando o
-- consentimento foi dado, e uma data responde às duas perguntas (se e quando) que um booleano
-- responde pela metade.
--
-- SEM BACKFILL, deliberadamente: nenhum cliente existente jamais consentiu explicitamente, e
-- preencher a coluna com a data de cadastro fabricaria um consentimento que nunca houve.
-- NULL = nunca consentiu.
--
-- Não confundir com `comunicacao_pausada_ate`, que é opt-out temporário de comunicação; aqui é
-- a base legal do envio de marketing.

ALTER TABLE "ampmais_clients" ADD COLUMN IF NOT EXISTS "consentimento_marketing_data" timestamp;
