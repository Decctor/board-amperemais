-- Fonte de dados ERPFlex — valor novo do enum de integrações.
-- `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma transação que consome o valor novo.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0077_erpflex_integration_type.sql
-- Idempotente (IF NOT EXISTS).

ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'ERP-FLEX';
