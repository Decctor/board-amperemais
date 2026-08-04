-- Migração de fontes de dados para `integrations` — Fase 0, parte 1 (D1/D7).
-- SOMENTE os valores novos do enum. `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma
-- transação que consome o valor novo — por isso este arquivo é separado do DDL de colunas e do
-- backfill. Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0059_data_source_integration_types.sql
-- Idempotente (IF NOT EXISTS).

ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'ONLINE-SOFTWARE';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'CARDAPIO-WEB';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'NUVEM-SHOP';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'IFOOD';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'BLING';
