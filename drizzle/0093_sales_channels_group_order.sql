-- Ordem dos grupos da vitrine por canal de venda: nomes de `products.grupo` na ordem em que o
-- catálogo deve exibi-los. Hoje só o canal SHOP lê; grupos fora da lista vão depois, em ordem
-- alfabética (ver sortGroupsByChannelOrder em lib/products/sales-channels.ts).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0093_sales_channels_group_order.sql
-- Idempotente e seguro para reexecução após falha parcial.

ALTER TABLE "ampmais_sales_channels"
	ADD COLUMN IF NOT EXISTS "ordem_grupos" text[] DEFAULT '{}'::text[] NOT NULL;
