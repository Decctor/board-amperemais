-- Endereço público da loja (/shop/{slug}) — fase 1 do plano
-- docs/dev-planning/org-slug-shop-links-plan.md. Nullable durante a migração; o backfill
-- (npm run backfill:organization-slugs -- --apply) preenche as orgs existentes e a fase 4
-- adiciona NOT NULL + unique index.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0080_organization_slug.sql
-- Idempotente (IF NOT EXISTS).

ALTER TABLE ampmais_organizations ADD COLUMN IF NOT EXISTS slug text;
