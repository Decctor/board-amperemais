-- Índices compostos de apoio ao histórico de vendas e às estatísticas de clientes:
-- essas queries sempre filtram por organização e ordenam/filtram por data, mas só
-- existiam índices de coluna única (data_venda, primeira_compra_data isolados).
CREATE INDEX IF NOT EXISTS "idx_sales_org_data_venda" ON "ampmais_sales" USING btree ("organizacao_id","data_venda");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_org_primeira_compra" ON "ampmais_clients" USING btree ("organizacao_id","primeira_compra_data");
