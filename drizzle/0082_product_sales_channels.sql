-- Fase 1 e 2 do plano de canais de venda (docs/product-sales-channels-design.md): flag de
-- vendabilidade no produto + registro de canais e overrides esparsos por (produto|variante, canal).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0082_product_sales_channels.sql
-- Idempotente (DO/EXCEPTION nos tipos, IF NOT EXISTS no resto) — pode ser reexecutada após falha parcial.

DO $$ BEGIN
  CREATE TYPE "public"."sales_channel_type" AS ENUM('POS', 'SHOP', 'COMANDA', 'IFOOD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."sales_channel_catalog_mode" AS ENUM('TODOS', 'SELECIONADOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "ampmais_products" ADD COLUMN IF NOT EXISTS "vendavel" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "ampmais_sales_channels" (
  "id" varchar(255) PRIMARY KEY NOT NULL, "organizacao_id" varchar(255) NOT NULL,
  "canal" "sales_channel_type" NOT NULL, "integracao_id" varchar(255), "ref_externo" varchar(255),
  "catalogo_modo" "sales_channel_catalog_mode" DEFAULT 'TODOS' NOT NULL,
  "data_insercao" timestamp DEFAULT now() NOT NULL, "data_atualizacao" timestamp
);
CREATE TABLE IF NOT EXISTS "ampmais_product_channel_settings" (
  "id" varchar(255) PRIMARY KEY NOT NULL, "organizacao_id" varchar(255) NOT NULL,
  "canal_venda_id" varchar(255) NOT NULL, "produto_id" varchar(255) NOT NULL, "produto_variante_id" varchar(255),
  "disponivel" boolean, "preco_venda" double precision, "data_insercao" timestamp DEFAULT now() NOT NULL, "data_atualizacao" timestamp
);

DO $$ BEGIN
  ALTER TABLE "ampmais_sales_channels" ADD CONSTRAINT "ampmais_sales_channels_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_sales_channels" ADD CONSTRAINT "ampmais_sales_channels_integracao_id_fk" FOREIGN KEY ("integracao_id") REFERENCES "public"."ampmais_integrations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_channel_settings" ADD CONSTRAINT "ampmais_product_channel_settings_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_channel_settings" ADD CONSTRAINT "ampmais_product_channel_settings_canal_venda_id_fk" FOREIGN KEY ("canal_venda_id") REFERENCES "public"."ampmais_sales_channels"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_channel_settings" ADD CONSTRAINT "ampmais_product_channel_settings_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_product_channel_settings" ADD CONSTRAINT "ampmais_product_channel_settings_produto_variante_id_fk" FOREIGN KEY ("produto_variante_id") REFERENCES "public"."ampmais_product_variants"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NULLS NOT DISTINCT: canais internos têm integracao_id/ref_externo nulos, e sem isso o Postgres
-- trataria cada linha nula como única — permitindo POS duplicado por organização.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_sales_channels_identity" ON "ampmais_sales_channels" ("organizacao_id", "canal", "integracao_id", "ref_externo") NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS "idx_sales_channels_organizacao" ON "ampmais_sales_channels" ("organizacao_id");
-- Idem: produto_variante_id nulo é a linha de nível produto, que também precisa ser única.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_product_channel_settings_node" ON "ampmais_product_channel_settings" ("canal_venda_id", "produto_id", "produto_variante_id") NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS "idx_product_channel_settings_canal" ON "ampmais_product_channel_settings" ("canal_venda_id");
CREATE INDEX IF NOT EXISTS "idx_product_channel_settings_org_produto" ON "ampmais_product_channel_settings" ("organizacao_id", "produto_id");
