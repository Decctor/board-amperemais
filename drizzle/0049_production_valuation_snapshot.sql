-- Valoração de produções: snapshot de custo e retorno esperado congelado na conclusão.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0049_production_valuation_snapshot.sql
--
-- Idempotente: seguro reaplicar. Todas as colunas sao nulaveis — produções ja concluidas antes
-- desta migracao permanecem sem snapshot e a tela cai na projecao pelo catalogo atual.

-- Totais da producao. Congelados no momento da conclusao (`data_snapshot_valores`), porque custo de
-- insumo e preco de venda mudam com o tempo e recalcular pelo catalogo atual distorceria o historico.
ALTER TABLE "ampmais_productions" ADD COLUMN IF NOT EXISTS "custo_total" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_productions" ADD COLUMN IF NOT EXISTS "retorno_esperado" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_productions" ADD COLUMN IF NOT EXISTS "data_snapshot_valores" timestamp;--> statement-breakpoint

-- Snapshots por item: tornam os totais auditaveis linha a linha. O custo unitario vem dos lotes
-- efetivamente consumidos quando ha rastreio de estoque, e do catalogo no restante.
ALTER TABLE "ampmais_production_inputs" ADD COLUMN IF NOT EXISTS "custo_unitario" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_production_outputs" ADD COLUMN IF NOT EXISTS "valor_unitario_venda" double precision;
