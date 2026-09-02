-- Regras de min/max de adicionais por vínculo produto↔grupo: a lista de opções vive no grupo
-- (compartilhado entre produtos), mas quantas escolhas cada produto permite varia (ex.: gelato
-- 1, 2 ou 3 sabores conforme o tamanho). null = herda a regra do grupo — nenhuma linha existente
-- muda de comportamento.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0091_add_on_reference_rule_overrides.sql
-- Idempotente (IF NOT EXISTS) — pode ser reexecutada após falha parcial.

ALTER TABLE "ampmais_product_add_on_references" ADD COLUMN IF NOT EXISTS "min_opcoes" integer;
ALTER TABLE "ampmais_product_add_on_references" ADD COLUMN IF NOT EXISTS "max_opcoes" integer;
