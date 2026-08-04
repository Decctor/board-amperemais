-- Migração de fontes de dados para `integrations` — Fase 0, parte 2 (colunas novas).
-- Aplicar DEPOIS de 0059 (enum). Idempotente.
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0060_data_source_integrations_columns.sql

-- Soft delete de fontes de dados (D9).
ALTER TABLE ampmais_integrations
	ADD COLUMN IF NOT EXISTS data_desativacao timestamp;

-- Proveniência da venda importada (D4). RESTRICT: a integração que originou vendas não é
-- apagada fisicamente (o fluxo normal usa soft delete).
ALTER TABLE ampmais_sales
	ADD COLUMN IF NOT EXISTS integracao_id varchar(255) REFERENCES ampmais_integrations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_sales_integracao ON ampmais_sales (integracao_id);

-- Config própria do POI (D8) — nesta entrega só `vendas.registroAtivo`.
ALTER TABLE ampmais_organizations
	ADD COLUMN IF NOT EXISTS poi_configuracao jsonb;
