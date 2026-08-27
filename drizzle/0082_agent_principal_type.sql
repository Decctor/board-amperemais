-- Novo tipo de principal para agentes de IA: CONTA_PLATAFORMA, o único ator sem organização
-- (Control e time interno falando com a base inteira).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0082_agent_principal_type.sql
-- Idempotente (IF NOT EXISTS).
--
-- SEPARADO DA 0083 DE PROPÓSITO: `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma
-- transação que consome o valor novo, e o runner aplica cada arquivo dentro de uma transação.
-- A CHECK constraint que referencia 'CONTA_PLATAFORMA' precisa de outro arquivo, aplicado depois.

ALTER TYPE access_principal_type ADD VALUE IF NOT EXISTS 'CONTA_PLATAFORMA';
