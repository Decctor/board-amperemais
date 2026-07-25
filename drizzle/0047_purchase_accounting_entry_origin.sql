-- Compras: origem COMPRA para os lancamentos contabeis gerados pelo modulo de compras.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0047_purchase_accounting_entry_origin.sql
--
-- ATENCAO: aplicar esta migracao ANTES do deploy do codigo. O novo valor do enum nao pode ser
-- utilizado na mesma transacao em que e criado, entao esta migracao precisa rodar sozinha.

ALTER TYPE "accounting_entry_origin_type" ADD VALUE IF NOT EXISTS 'COMPRA';
