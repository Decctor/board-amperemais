-- Fase 4 do plano de canais de venda (docs/product-sales-channels-design.md §5) e fundacao do
-- docs/ifood-catalog-linking-sync-design.md: vinculo entre o cadastro interno e o catalogo remoto.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0083_catalog_links.sql
-- Idempotente (DO/EXCEPTION nos tipos, IF NOT EXISTS no resto).

DO $$ BEGIN
  CREATE TYPE "public"."catalog_link_provider" AS ENUM('IFOOD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."catalog_link_type" AS ENUM('PRODUTO', 'VARIANTE', 'ADD_ON', 'ADD_ON_OPCAO', 'CATEGORIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."catalog_link_status" AS ENUM('PENDENTE', 'SINCRONIZADO', 'DIVERGENTE', 'ERRO', 'DESVINCULADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ampmais_catalog_links" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "organizacao_id" varchar(255) NOT NULL,
  "provider" "catalog_link_provider" NOT NULL,
  "merchant_id" varchar(255) NOT NULL,
  "tipo" "catalog_link_type" NOT NULL,
  "produto_id" varchar(255),
  "produto_variante_id" varchar(255),
  "produto_add_on_id" varchar(255),
  "produto_add_on_opcao_id" varchar(255),
  "grupo_interno" text,
  "externo_produto_id" varchar(255),
  "externo_item_id" varchar(255),
  "externo_categoria_id" varchar(255),
  "externo_option_group_id" varchar(255),
  "externo_option_id" varchar(255),
  "sincronizar" jsonb NOT NULL,
  "status" "catalog_link_status" DEFAULT 'PENDENTE' NOT NULL,
  "ultimo_snapshot" jsonb,
  "divergencias" jsonb,
  "ultimo_erro" text,
  "data_ultima_sincronizacao" timestamp,
  "autor_id" varchar(255),
  "data_insercao" timestamp DEFAULT now() NOT NULL,
  "data_atualizacao" timestamp
);

DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_produto_variante_id_fk" FOREIGN KEY ("produto_variante_id") REFERENCES "public"."ampmais_product_variants"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_produto_add_on_id_fk" FOREIGN KEY ("produto_add_on_id") REFERENCES "public"."ampmais_product_add_ons"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_produto_add_on_opcao_id_fk" FOREIGN KEY ("produto_add_on_opcao_id") REFERENCES "public"."ampmais_product_add_on_options"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ampmais_catalog_links" ADD CONSTRAINT "ampmais_catalog_links_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NULLS NOT DISTINCT: as colunas de referencia interna sao mutuamente exclusivas (so uma e
-- preenchida por tipo), entao sem a clausula cada NULL contaria como distinto e o mesmo produto
-- poderia ser vinculado duas vezes na mesma loja.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_catalog_links_identity" ON "ampmais_catalog_links"
  ("organizacao_id", "provider", "merchant_id", "tipo", "produto_id", "produto_variante_id", "produto_add_on_id", "produto_add_on_opcao_id") NULLS NOT DISTINCT;
-- Um item remoto pertence a no maximo um vinculo por loja (parcial: itens nulos nao competem).
CREATE UNIQUE INDEX IF NOT EXISTS "unq_catalog_links_externo_item" ON "ampmais_catalog_links"
  ("organizacao_id", "provider", "merchant_id", "externo_item_id") WHERE "externo_item_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_catalog_links_org_status" ON "ampmais_catalog_links" ("organizacao_id", "provider", "merchant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_catalog_links_produto" ON "ampmais_catalog_links" ("organizacao_id", "produto_id");
