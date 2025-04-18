CREATE TABLE "ampmais_clients" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"email" text,
	"canal_aquisicao" text,
	"primeira_compra_data" timestamp,
	"primeira_compra_id" varchar,
	"ultima_compra_data" timestamp,
	"ultima_compra_id" varchar,
	"data_insercao" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ampmais_products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"codigo" text NOT NULL,
	"unidade" text NOT NULL,
	"ncm" text NOT NULL,
	"tipo" text NOT NULL,
	"grupo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampmais_sale_items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"venda_id" varchar(255) NOT NULL,
	"cliente_id" varchar(255) NOT NULL,
	"produto_id" varchar(255) NOT NULL,
	"quantidade" double precision NOT NULL,
	"valor_unitario" double precision NOT NULL,
	"valor_custo_unitario" double precision NOT NULL,
	"valor_venda_total_bruto" double precision NOT NULL,
	"valor_total_desconto" double precision NOT NULL,
	"valor_venda_total_liquido" double precision NOT NULL,
	"valor_custo_total" double precision NOT NULL,
	"metadados" jsonb
);
--> statement-breakpoint
CREATE TABLE "ampmais_sales" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cliente_id" varchar(255) NOT NULL,
	"id_externo" text NOT NULL,
	"valor_total" double precision NOT NULL,
	"custo_total" double precision NOT NULL,
	"vendedor" text NOT NULL,
	"parceiro" text NOT NULL,
	"chave" text NOT NULL,
	"documento" text NOT NULL,
	"modelo" text NOT NULL,
	"movimento" text NOT NULL,
	"natureza" text NOT NULL,
	"serie" text NOT NULL,
	"situacao" text NOT NULL,
	"tipo" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_venda_id_ampmais_sales_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."ampmais_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_cliente_id_ampmais_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."ampmais_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_produto_id_ampmais_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_cliente_id_ampmais_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."ampmais_clients"("id") ON DELETE no action ON UPDATE no action;