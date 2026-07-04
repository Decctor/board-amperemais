ALTER TABLE "ampmais_purchase_items" ADD COLUMN "data_validade" timestamp;--> statement-breakpoint
ALTER TABLE "ampmais_product_stock_lots" ADD COLUMN "compra_item_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ampmais_product_stock_lots" ADD CONSTRAINT "ampmais_product_stock_lots_compra_item_id_ampmais_purchase_items_id_fk" FOREIGN KEY ("compra_item_id") REFERENCES "public"."ampmais_purchase_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_stock_lots_compra_item" ON "ampmais_product_stock_lots" USING btree ("compra_item_id");
