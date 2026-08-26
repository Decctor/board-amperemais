-- Fase 4 do plano de slugs (docs/dev-planning/org-slug-shop-links-plan.md): trava as garantias
-- do endereço público da loja depois que o backfill da fase 2 preencheu todas as organizações.
-- PRÉ-REQUISITO: `npm run verify:organization-slugs` precisa reportar sem_slug=0 e duplicados=0.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0081_organization_slug_not_null.sql
-- Idempotente (IF NOT EXISTS / SET NOT NULL é no-op quando já aplicado).

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON ampmais_organizations (slug);

ALTER TABLE ampmais_organizations ALTER COLUMN slug SET NOT NULL;
