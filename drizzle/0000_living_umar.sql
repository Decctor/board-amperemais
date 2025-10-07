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
	"analise_rfm_titulo" text,
	"analise_rfm_notas_recencia" text,
	"analise_rfm_notas_frequencia" text,
	"analise_rfm_notas_monetario" text,
	"analise_rfm_ultima_atualizacao" timestamp,
	"data_insercao" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ampmais_goals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"data_inicio" timestamp NOT NULL,
	"data_fim" timestamp NOT NULL,
	"objetivo_valor" double precision NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampmais_goals_sellers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"vendedor_id" varchar(255) NOT NULL,
	"objetivo_valor" double precision NOT NULL
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
	"vendedor_nome" text NOT NULL,
	"vendedor_id" varchar(255),
	"parceiro" text NOT NULL,
	"chave" text NOT NULL,
	"documento" text NOT NULL,
	"modelo" text NOT NULL,
	"movimento" text NOT NULL,
	"natureza" text NOT NULL,
	"serie" text NOT NULL,
	"situacao" text NOT NULL,
	"tipo" text NOT NULL,
	"data_venda" timestamp
);
--> statement-breakpoint
CREATE TABLE "ampmais_sellers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"identificador" text NOT NULL,
	"telefone" text,
	"email" text,
	"avatar_url" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_goals_sellers" ADD CONSTRAINT "ampmais_goals_sellers_goal_id_ampmais_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."ampmais_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_goals_sellers" ADD CONSTRAINT "ampmais_goals_sellers_vendedor_id_ampmais_sellers_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."ampmais_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_venda_id_ampmais_sales_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."ampmais_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_cliente_id_ampmais_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."ampmais_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_produto_id_ampmais_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_cliente_id_ampmais_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."ampmais_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_vendedor_id_ampmais_sellers_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."ampmais_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_nome" ON "ampmais_clients" USING gin (to_tsvector('portuguese', "nome"));--> statement-breakpoint
CREATE INDEX "idx_clients_rfm_titulo" ON "ampmais_clients" USING btree ("analise_rfm_titulo");--> statement-breakpoint
CREATE INDEX "idx_products_grupo" ON "ampmais_products" USING btree ("grupo");--> statement-breakpoint
CREATE INDEX "idx_sale_items_venda_id" ON "ampmais_sale_items" USING btree ("venda_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_produto_id" ON "ampmais_sale_items" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_cliente_id" ON "ampmais_sale_items" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_sale_items_valores" ON "ampmais_sale_items" USING btree ("valor_venda_total_liquido","valor_custo_total");--> statement-breakpoint
CREATE INDEX "idx_sales_client_id" ON "ampmais_sales" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_sales_parceiro" ON "ampmais_sales" USING btree ("parceiro");--> statement-breakpoint
CREATE INDEX "idx_sales_data_venda" ON "ampmais_sales" USING btree ("data_venda");--> statement-breakpoint
CREATE INDEX "idx_sales_vendedor" ON "ampmais_sales" USING btree ("vendedor_nome");--> statement-breakpoint
CREATE INDEX "idx_sales_natureza" ON "ampmais_sales" USING btree ("natureza");--> statement-breakpoint
CREATE INDEX "idx_sales_valor_total" ON "ampmais_sales" USING btree ("valor_total");