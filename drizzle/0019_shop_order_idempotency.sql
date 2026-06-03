CREATE TABLE "ampmais_shop_order_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"payload_hash" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'PROCESSANDO' NOT NULL,
	"venda_id" varchar(255),
	"erro" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);
--> statement-breakpoint
ALTER TABLE "ampmais_shop_order_requests" ADD CONSTRAINT "ampmais_shop_order_requests_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ampmais_shop_order_requests" ADD CONSTRAINT "ampmais_shop_order_requests_venda_id_ampmais_sales_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."ampmais_sales"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shop_order_requests_org_idempotency_unique" ON "ampmais_shop_order_requests" USING btree ("organizacao_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "idx_shop_order_requests_venda_id" ON "ampmais_shop_order_requests" USING btree ("venda_id");
