-- Perdas de estoque: origem PERDA_ESTOQUE para lancamentos gerados por descartes de lotes,
-- e vinculo lancamento -> lote (rastreabilidade da perda).
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0063_stock_loss_accounting.sql
--
-- ATENCAO: aplicar esta migracao ANTES do deploy do codigo. O novo valor do enum nao pode ser
-- utilizado na mesma transacao em que e criado, entao esta migracao precisa rodar sozinha.

ALTER TYPE "accounting_entry_origin_type" ADD VALUE IF NOT EXISTS 'PERDA_ESTOQUE';

ALTER TABLE "ampmais_accounting_entries" ADD COLUMN IF NOT EXISTS "lote_id" varchar(255);

ALTER TABLE "ampmais_accounting_entries" ADD CONSTRAINT "ampmais_accounting_entries_lote_id_ampmais_product_stock_lots_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."ampmais_product_stock_lots"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_accounting_entries_lote_id" ON "ampmais_accounting_entries" ("lote_id");
