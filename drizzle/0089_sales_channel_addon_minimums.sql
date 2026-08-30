-- Exigência de adicionais obrigatórios por canal de venda: os mínimos dos grupos
-- (`ampmais_product_add_ons.min_opcoes`) passam a valer por canal, e não mais globalmente.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0089_sales_channel_addon_minimums.sql
-- Idempotente (IF NOT EXISTS) — pode ser reexecutada após falha parcial.

-- DEFAULT true preenche as linhas existentes: nenhuma organização muda de comportamento pela
-- migração. Relaxar o balcão é uma escolha explícita da org no toggle do canal.
ALTER TABLE "ampmais_sales_channels" ADD COLUMN IF NOT EXISTS "exigir_adicionais_minimos" boolean DEFAULT true NOT NULL;
