CREATE INDEX "idx_sale_items_venda_id" ON "ampmais_sale_items" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_produto_id" ON "ampmais_sale_items" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_cliente_id" ON "ampmais_sale_items" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_valores" ON "ampmais_sale_items" USING btree ("valor_venda_total_liquido","valor_custo_total");--> statement-breakpoint
CREATE INDEX "idx_sales_data_venda" ON "ampmais_sales" USING btree ("data_venda");--> statement-breakpoint
CREATE INDEX "idx_sales_vendedor" ON "ampmais_sales" USING btree ("vendedor");--> statement-breakpoint
CREATE INDEX "idx_sales_natureza" ON "ampmais_sales" USING btree ("natureza");--> statement-breakpoint
CREATE INDEX "idx_sales_valor_total" ON "ampmais_sales" USING btree ("valor_total");