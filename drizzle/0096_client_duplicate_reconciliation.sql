-- Reconciliação de clientes duplicados
-- (docs/dev-planning/client-duplicate-reconciliation-plan.md).
--
-- Fase 0: fecha o buraco pré-existente de cashback_program_balances — o código
--   (ensureCashbackBalanceForClient) sempre assumiu no máximo uma linha por
--   (organizacao, cliente, programa), mas o índice único não existia. Antes de
--   criá-lo: backfill de organizacao_id nulo e consolidação de duplicatas
--   (soma dos saldos na linha de adesão mais antiga).
-- Fase 1: tabelas de candidatos a duplicidade e de auditoria de merges.
--
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0096_client_duplicate_reconciliation.sql
-- Idempotente (IF NOT EXISTS; o dedupe re-executado é um no-op).

-- ── Fase 0.1: organizacao_id nulo herda a organização do cliente ─────────────
UPDATE "ampmais_cashback_program_balances" b
SET "organizacao_id" = c."organizacao_id"
FROM "ampmais_clients" c
WHERE b."cliente_id" = c."id" AND b."organizacao_id" IS NULL;

-- ── Fase 0.2: consolida saldos duplicados de (cliente, programa) ─────────────
-- Mantém a linha de adesão mais antiga ("Membro desde") e soma os três saldos
-- das demais nela.
WITH ranked AS (
	SELECT "id", "cliente_id", "programa_id",
		row_number() OVER (
			PARTITION BY "cliente_id", "programa_id"
			ORDER BY "data_adesao" ASC, "data_insercao" ASC, "id" ASC
		) AS rn
	FROM "ampmais_cashback_program_balances"
),
sums AS (
	SELECT r."cliente_id", r."programa_id",
		sum(b."saldo_valor_disponivel") AS disponivel,
		sum(b."saldo_valor_acumulado_total") AS acumulado,
		sum(b."saldo_valor_resgatado_total") AS resgatado
	FROM ranked r
	JOIN "ampmais_cashback_program_balances" b ON b."id" = r."id"
	WHERE r.rn > 1
	GROUP BY r."cliente_id", r."programa_id"
)
UPDATE "ampmais_cashback_program_balances" b
SET "saldo_valor_disponivel" = b."saldo_valor_disponivel" + s.disponivel,
	"saldo_valor_acumulado_total" = b."saldo_valor_acumulado_total" + s.acumulado,
	"saldo_valor_resgatado_total" = b."saldo_valor_resgatado_total" + s.resgatado,
	"data_atualizacao" = now()
FROM ranked r, sums s
WHERE b."id" = r."id" AND r.rn = 1
	AND s."cliente_id" = r."cliente_id" AND s."programa_id" = r."programa_id";

WITH ranked AS (
	SELECT "id",
		row_number() OVER (
			PARTITION BY "cliente_id", "programa_id"
			ORDER BY "data_adesao" ASC, "data_insercao" ASC, "id" ASC
		) AS rn
	FROM "ampmais_cashback_program_balances"
)
DELETE FROM "ampmais_cashback_program_balances" b
USING ranked r
WHERE b."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_cashback_balances_org_cliente_programa"
	ON "ampmais_cashback_program_balances" ("organizacao_id", "cliente_id", "programa_id");

-- ── Fase 1: candidatos a duplicidade ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ampmais_client_duplicate_candidates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE CASCADE,
	"cliente_a_id" varchar(255) NOT NULL REFERENCES "ampmais_clients"("id") ON DELETE CASCADE,
	"cliente_b_id" varchar(255) NOT NULL REFERENCES "ampmais_clients"("id") ON DELETE CASCADE,
	"motivos" jsonb NOT NULL,
	"status" varchar(16) NOT NULL DEFAULT 'PENDENTE',
	"descarte_data" timestamp,
	"descarte_autor_id" varchar(255) REFERENCES "ampmais_users"("id") ON DELETE SET NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_duplicate_candidates_pair_unique_idx"
	ON "ampmais_client_duplicate_candidates" ("organizacao_id", "cliente_a_id", "cliente_b_id");
CREATE INDEX IF NOT EXISTS "idx_client_duplicate_candidates_org_status"
	ON "ampmais_client_duplicate_candidates" ("organizacao_id", "status");
CREATE INDEX IF NOT EXISTS "idx_client_duplicate_candidates_org_cliente_a"
	ON "ampmais_client_duplicate_candidates" ("organizacao_id", "cliente_a_id");
CREATE INDEX IF NOT EXISTS "idx_client_duplicate_candidates_org_cliente_b"
	ON "ampmais_client_duplicate_candidates" ("organizacao_id", "cliente_b_id");

-- ── Fase 1: auditoria de merges ──────────────────────────────────────────────
-- Ids de cliente sem FK de propósito: a origem é hard-deleted no merge.
CREATE TABLE IF NOT EXISTS "ampmais_client_merge_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE CASCADE,
	"keeper_cliente_id" varchar(255) NOT NULL,
	"origem_cliente_id" varchar(255) NOT NULL,
	"candidato_id" varchar(255),
	"origem_snapshot" jsonb NOT NULL,
	"campos_escolhidos" jsonb,
	"registros_movidos" jsonb,
	"saldos_cashback" jsonb,
	"autor_id" varchar(255) REFERENCES "ampmais_users"("id") ON DELETE SET NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_client_merge_logs_org_keeper"
	ON "ampmais_client_merge_logs" ("organizacao_id", "keeper_cliente_id");
