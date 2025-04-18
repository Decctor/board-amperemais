CREATE INDEX "idx_clients_rfm_titulo" ON "ampmais_clients" USING btree ("analise_rfm_titulo");--> statement-breakpoint
CREATE INDEX "idx_products_grupo" ON "ampmais_products" USING btree ("grupo");