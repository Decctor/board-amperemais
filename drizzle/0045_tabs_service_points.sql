-- Tabs / Pontos de Atendimento — Fase 1 (docs/tabs/implementation-plan.md)
-- DDL aditivo. Aplicado via scripts/apply-sql-migration.ts (drizzle push/generate travam em prompts de drift).

-- 1. Enums
CREATE TYPE "tab_status" AS ENUM ('ABERTA', 'FECHADA', 'CANCELADA');
CREATE TYPE "service_point_type" AS ENUM ('MESA', 'BALCAO', 'QUIOSQUE', 'OUTRO');
CREATE TYPE "product_stock_deduction_mode" AS ENUM ('ESTOQUE_PROPRIO', 'COMPOSICAO');

-- 2. service_settings (1:1 por organizacao, padrao shop_settings)
CREATE TABLE "ampmais_service_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"configuracoes" jsonb NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp,
	CONSTRAINT "ampmais_service_settings_organizacao_id_unique" UNIQUE ("organizacao_id"),
	CONSTRAINT "ampmais_service_settings_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade
);
CREATE INDEX "idx_service_settings_organizacao" ON "ampmais_service_settings" ("organizacao_id");

-- 3. service_points
CREATE TABLE "ampmais_service_points" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"rotulo" text NOT NULL,
	"grupo" text,
	"tipo" "service_point_type" DEFAULT 'MESA' NOT NULL,
	"capacidade" double precision,
	"token_publico_hash" varchar(64) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"metadados" jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_service_points_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade
);
CREATE INDEX "idx_service_points_org_ativo" ON "ampmais_service_points" ("organizacao_id", "ativo");
CREATE UNIQUE INDEX "idx_service_points_token_publico_hash" ON "ampmais_service_points" ("token_publico_hash");

-- 4. tabs
CREATE TABLE "ampmais_tabs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"service_point_id" varchar(255),
	"codigo" text,
	"cliente_id" varchar(255),
	"status" "tab_status" DEFAULT 'ABERTA' NOT NULL,
	"token_publico_hash" varchar(64) NOT NULL,
	"responsavel_vendedor_id" varchar(255),
	"aberta_por_usuario_id" varchar(255),
	"fechada_por_usuario_id" varchar(255),
	"valor_total" double precision,
	"observacoes" text,
	"metadados" jsonb,
	"data_abertura" timestamp DEFAULT now() NOT NULL,
	"data_fechamento" timestamp,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_tabs_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_tabs_service_point_id_fk" FOREIGN KEY ("service_point_id") REFERENCES "ampmais_service_points"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tabs_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "ampmais_clients"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tabs_responsavel_vendedor_id_fk" FOREIGN KEY ("responsavel_vendedor_id") REFERENCES "ampmais_sellers"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tabs_aberta_por_usuario_id_fk" FOREIGN KEY ("aberta_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tabs_fechada_por_usuario_id_fk" FOREIGN KEY ("fechada_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);
CREATE INDEX "idx_tabs_org_status" ON "ampmais_tabs" ("organizacao_id", "status");
CREATE INDEX "idx_tabs_service_point" ON "ampmais_tabs" ("service_point_id");
CREATE UNIQUE INDEX "idx_tabs_token_publico_hash" ON "ampmais_tabs" ("token_publico_hash");
-- Impede duas comandas fisicas com o mesmo codigo abertas ao mesmo tempo; libera reuso apos fechar.
CREATE UNIQUE INDEX "idx_tabs_org_codigo_aberta" ON "ampmais_tabs" ("organizacao_id", "codigo")
	WHERE status = 'ABERTA' AND codigo IS NOT NULL;

-- 5. tab_orders
CREATE TABLE "ampmais_tab_orders" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"tab_id" varchar(255) NOT NULL,
	"numero" double precision NOT NULL,
	"status" "sale_attendance_status" DEFAULT 'EM_PREPARO' NOT NULL,
	"observacoes" text,
	"lancado_por_usuario_id" varchar(255),
	"data_envio" timestamp DEFAULT now() NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_tab_orders_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_tab_orders_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "ampmais_tabs"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_tab_orders_lancado_por_usuario_id_fk" FOREIGN KEY ("lancado_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);
CREATE INDEX "idx_tab_orders_tab" ON "ampmais_tab_orders" ("tab_id");
CREATE INDEX "idx_tab_orders_org_status" ON "ampmais_tab_orders" ("organizacao_id", "status");
CREATE UNIQUE INDEX "idx_tab_orders_tab_numero" ON "ampmais_tab_orders" ("tab_id", "numero");

-- 6. sales.tab_id + partial unique de rascunho por tab
ALTER TABLE "ampmais_sales" ADD COLUMN "tab_id" varchar(255);
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "ampmais_tabs"("id") ON DELETE set null;
CREATE INDEX "idx_sales_tab" ON "ampmais_sales" ("tab_id");
-- Uma unica venda em rascunho por conta de atendimento.
CREATE UNIQUE INDEX "idx_sales_tab_rascunho" ON "ampmais_sales" ("tab_id")
	WHERE status_venda = 'ORCAMENTO' AND tab_id IS NOT NULL;

-- 7. sale_items.tab_order_id
ALTER TABLE "ampmais_sale_items" ADD COLUMN "tab_order_id" varchar(255);
ALTER TABLE "ampmais_sale_items" ADD CONSTRAINT "ampmais_sale_items_tab_order_id_fk" FOREIGN KEY ("tab_order_id") REFERENCES "ampmais_tab_orders"("id") ON DELETE set null;
CREATE INDEX "idx_sale_items_tab_order" ON "ampmais_sale_items" ("tab_order_id");

-- 8. products: modo de baixa + ficha tecnica (fiacao da explosao na Fase 2)
ALTER TABLE "ampmais_products" ADD COLUMN "baixa_estoque_modo" "product_stock_deduction_mode" DEFAULT 'ESTOQUE_PROPRIO' NOT NULL;
ALTER TABLE "ampmais_products" ADD COLUMN "ficha_tecnica_receita_id" varchar(255);
ALTER TABLE "ampmais_products" ADD CONSTRAINT "ampmais_products_ficha_tecnica_receita_id_fk" FOREIGN KEY ("ficha_tecnica_receita_id") REFERENCES "ampmais_production_recipes"("id") ON DELETE SET NULL;
