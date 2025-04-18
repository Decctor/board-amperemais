ALTER TABLE "ampmais_sales" ADD COLUMN "data_venda" timestamp;--> statement-breakpoint
ALTER TABLE "ampmais_products" ADD CONSTRAINT "ampmais_products_codigo_unique" UNIQUE("codigo");