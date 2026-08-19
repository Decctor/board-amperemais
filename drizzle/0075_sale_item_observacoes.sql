-- Observação por item de venda ("sem cebola", "ponto mal passado"). Hoje o texto livre só existe
-- no nível da venda (sales.observacoes) e da rodada de comanda (tab_orders.observacoes) — nunca
-- preso ao item, que é onde a cozinha precisa lê-lo.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0075_sale_item_observacoes.sql

ALTER TABLE "ampmais_sale_items"
	ADD COLUMN "observacoes" text;
