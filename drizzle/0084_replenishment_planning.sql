-- Fundacao do planejamento de reposicao (docs/replenishment-planning-design.md).
-- Politica de compra por organizacao e por produto, mais o snapshot de posicao de estoque
-- importado (usado quando o ERP externo, e nao o RecompraCRM, e a fonte da verdade do saldo).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0084_replenishment_planning.sql
-- Idempotente (DO/EXCEPTION nos tipos, IF NOT EXISTS no resto).

DO $$ BEGIN
  CREATE TYPE "public"."stock_position_source" AS ENUM('SISTEMA', 'IMPORTACAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."stock_position_import_origin" AS ENUM('PLANILHA', 'PDF', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."stock_position_import_status" AS ENUM('PROCESSANDO', 'CONCLUIDA', 'ERRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ampmais_replenishment_settings" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "organizacao_id" varchar(255) NOT NULL,
  "janela_analise_dias" integer DEFAULT 90 NOT NULL,
  "lead_time_dias_padrao" integer DEFAULT 15 NOT NULL,
  "ciclo_revisao_dias" integer DEFAULT 15 NOT NULL,
  "dias_cobertura_alvo" integer DEFAULT 30 NOT NULL,
  "nivel_servico" double precision DEFAULT 0.95 NOT NULL,
  "dias_excesso_limite" integer DEFAULT 30 NOT NULL,
  "ajustar_demanda_por_ruptura" boolean DEFAULT true NOT NULL,
  "origem_estoque_padrao" varchar(20) DEFAULT 'SISTEMA' NOT NULL,
  "data_insercao" timestamp DEFAULT now() NOT NULL,
  "data_atualizacao" timestamp DEFAULT now() NOT NULL,
  "autor_id" varchar(255)
);

DO $$ BEGIN
  ALTER TABLE "ampmais_replenishment_settings" ADD CONSTRAINT "ampmais_replenishment_settings_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_replenishment_settings" ADD CONSTRAINT "ampmais_replenishment_settings_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Uma politica por loja: a leitura da analise faz findFirst por organizacao e nao deve escolher
-- entre duas linhas concorrentes criadas por dois usuarios salvando ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_replenishment_settings_organizacao" ON "ampmais_replenishment_settings" ("organizacao_id");

CREATE TABLE IF NOT EXISTS "ampmais_product_replenishment_settings" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "organizacao_id" varchar(255) NOT NULL,
  "produto_id" varchar(255) NOT NULL,
  "produto_variante_id" varchar(255),
  "sobressalente" boolean DEFAULT false NOT NULL,
  "nao_promover" boolean DEFAULT false NOT NULL,
  "descontinuado" boolean DEFAULT false NOT NULL,
  "fornecedor_preferencial_id" varchar(255),
  "lead_time_dias" integer,
  "multiplo_compra" double precision,
  "quantidade_minima_compra" double precision,
  "estoque_minimo" double precision,
  "estoque_maximo" double precision,
  "anotacoes" text,
  "data_insercao" timestamp DEFAULT now() NOT NULL,
  "data_atualizacao" timestamp DEFAULT now() NOT NULL,
  "autor_id" varchar(255)
);

DO $$ BEGIN
  ALTER TABLE "ampmais_product_replenishment_settings" ADD CONSTRAINT "ampmais_product_replenishment_settings_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_replenishment_settings" ADD CONSTRAINT "ampmais_product_replenishment_settings_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_replenishment_settings" ADD CONSTRAINT "ampmais_product_replenishment_settings_produto_variante_id_fk" FOREIGN KEY ("produto_variante_id") REFERENCES "public"."ampmais_product_variants"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_replenishment_settings" ADD CONSTRAINT "ampmais_product_replenishment_settings_fornecedor_preferencial_id_fk" FOREIGN KEY ("fornecedor_preferencial_id") REFERENCES "public"."ampmais_suppliers"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_replenishment_settings" ADD CONSTRAINT "ampmais_product_replenishment_settings_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_product_replenishment_settings_organizacao" ON "ampmais_product_replenishment_settings" ("organizacao_id");
-- Um produto tem no maximo uma politica: a analise resolve o override por produto_id direto.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_product_replenishment_settings_produto" ON "ampmais_product_replenishment_settings" ("produto_id");

CREATE TABLE IF NOT EXISTS "ampmais_stock_position_imports" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "organizacao_id" varchar(255) NOT NULL,
  "origem" "stock_position_import_origin" DEFAULT 'PLANILHA' NOT NULL,
  "status" "stock_position_import_status" DEFAULT 'PROCESSANDO' NOT NULL,
  "arquivo_nome" text,
  "data_posicao" timestamp DEFAULT now() NOT NULL,
  "linhas_lidas" integer DEFAULT 0 NOT NULL,
  "linhas_conciliadas" integer DEFAULT 0 NOT NULL,
  "linhas_nao_conciliadas" integer DEFAULT 0 NOT NULL,
  "mapeamento_colunas" jsonb,
  "erro" text,
  "data_insercao" timestamp DEFAULT now() NOT NULL,
  "autor_id" varchar(255)
);

DO $$ BEGIN
  ALTER TABLE "ampmais_stock_position_imports" ADD CONSTRAINT "ampmais_stock_position_imports_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_stock_position_imports" ADD CONSTRAINT "ampmais_stock_position_imports_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_stock_position_imports_organizacao" ON "ampmais_stock_position_imports" ("organizacao_id");
CREATE INDEX IF NOT EXISTS "idx_stock_position_imports_data_posicao" ON "ampmais_stock_position_imports" ("organizacao_id", "data_posicao");

CREATE TABLE IF NOT EXISTS "ampmais_stock_position_import_items" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "organizacao_id" varchar(255) NOT NULL,
  "importacao_id" varchar(255) NOT NULL,
  "codigo" text NOT NULL,
  "descricao" text,
  "produto_id" varchar(255),
  "quantidade" double precision NOT NULL,
  "custo_unitario" double precision,
  "preco_venda" double precision,
  "quantidade_em_transito" double precision,
  "fornecedor_nome" text,
  "data_insercao" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "ampmais_stock_position_import_items" ADD CONSTRAINT "ampmais_stock_position_import_items_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_stock_position_import_items" ADD CONSTRAINT "ampmais_stock_position_import_items_importacao_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."ampmais_stock_position_imports"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_stock_position_import_items" ADD CONSTRAINT "ampmais_stock_position_import_items_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_stock_position_import_items_importacao" ON "ampmais_stock_position_import_items" ("importacao_id");
CREATE INDEX IF NOT EXISTS "idx_stock_position_import_items_produto" ON "ampmais_stock_position_import_items" ("produto_id");
CREATE INDEX IF NOT EXISTS "idx_stock_position_import_items_codigo" ON "ampmais_stock_position_import_items" ("organizacao_id", "codigo");

-- A analise le vendas por produto em janelas de 30/60/90 dias. Sem este indice o filtro por
-- periodo em sale_items vira seq scan no historico inteiro da loja a cada abertura da tela.
CREATE INDEX IF NOT EXISTS "idx_sale_items_organizacao_produto" ON "ampmais_sale_items" ("organizacao_id", "produto_id");
