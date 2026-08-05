-- Gate de resgate pelo Ponto de Interacao + momento de adesao ao clube.
--
-- 1) `resgate_permitir_via_ponto_integracao` no programa de cashback: par simetrico de
--    `acumulo_permitir_via_ponto_integracao`. Ate aqui o resgate pelo POI nunca teve gate.
--    Default `true` preserva o comportamento vigente para todas as organizacoes.
-- 2) `data_adesao` no saldo (a linha de fato de "membro do clube"): o momento explicito de
--    adesao, exibido como "Membro desde". Backfill = `data_insercao`, que hoje ja e a melhor
--    aproximacao disponivel do instante em que a linha de saldo passou a existir.
--
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0069_cashback_poi_redemption_gate_and_membership_date.sql

-- 1. Colunas novas (idempotente).
ALTER TABLE "ampmais_cashback_programs"
	ADD COLUMN IF NOT EXISTS "resgate_permitir_via_ponto_integracao" boolean DEFAULT true NOT NULL;

ALTER TABLE "ampmais_cashback_program_balances"
	ADD COLUMN IF NOT EXISTS "data_adesao" timestamp DEFAULT now() NOT NULL;

-- 2. Sem backfill do gate — de proposito. O resgate pelo POI era sempre permitido antes do gate
-- existir, entao o unico estado que preserva o comportamento e `true` para todo mundo, e o default
-- da coluna ja entrega isso. Organizacoes no tier ERP que preferem operar o resgate pelo ERP/PDV
-- desligam o gate na configuracao do proprio programa de cashback.

-- 3. Backfill da adesao: para as linhas ja existentes o default `now()` acima gravou o instante
-- da migracao, que nao e a adesao real. Reescreve com `data_insercao`.
-- Guard `>`: as linhas pre-existentes receberam `now()` no ALTER, logo `data_adesao` ficou
-- POSTERIOR a `data_insercao`; linhas inseridas depois do deploy recebem ambos do mesmo `now()`
-- transacional e ja saem iguais. Backfill de uma vez so — nao re-rodar depois que a adesao passar
-- a ser gravada explicitamente, sob risco de sobrescrever adesoes legitimamente tardias.
UPDATE "ampmais_cashback_program_balances"
SET "data_adesao" = "data_insercao"
WHERE "data_adesao" > "data_insercao";
