-- Importacao de compra por IA: de-para corrigivel, matching de produto indexavel e fator de
-- conversao de unidade.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0048_purchase_import_matching_and_de_para.sql
--
-- Idempotente: seguro reaplicar. A etapa de deduplicacao apaga linhas de de-para redundantes
-- (mesmo fornecedor + mesmo codigo/EAN), preservando sempre a mais recente.

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- `unaccent` e STABLE, entao nao serve para indice. O wrapper IMMUTABLE ja e usado por
-- `idx_clients_nome` e por lib/search.ts; criado aqui apenas se ainda nao existir, nunca
-- substituido (um CREATE OR REPLACE invalidaria os indices construidos sobre ele).
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'unaccent_immutable') THEN
		CREATE FUNCTION unaccent_immutable(text) RETURNS text
			LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
			AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$;
	END IF;
END $$;--> statement-breakpoint

-- Shortlist por similaridade do nome do produto na conciliacao de itens da nota. O indice GIN de
-- full-text existente nao cobre busca parcial nem tolera erro de grafia da descricao impressa.
CREATE INDEX IF NOT EXISTS "idx_products_nome" ON "ampmais_products"
	USING gist (unaccent_immutable(lower("nome")) gist_trgm_ops);--> statement-breakpoint

-- Deduplicacao previa: o de-para nunca teve restricao de unicidade, entao pode haver linhas
-- concorrentes para o mesmo (fornecedor, codigo) ou (fornecedor, EAN). Mantem a mais recente,
-- que e a que o operador confirmou por ultimo.
DELETE FROM "ampmais_supplier_product_mappings" a
	USING "ampmais_supplier_product_mappings" b
	WHERE a."codigo_fornecedor" IS NOT NULL
		AND a."fornecedor_id" = b."fornecedor_id"
		AND a."codigo_fornecedor" = b."codigo_fornecedor"
		AND (a."data_insercao", a."id") < (b."data_insercao", b."id");--> statement-breakpoint

DELETE FROM "ampmais_supplier_product_mappings" a
	USING "ampmais_supplier_product_mappings" b
	WHERE a."ean" IS NOT NULL
		AND a."fornecedor_id" = b."fornecedor_id"
		AND a."ean" = b."ean"
		AND (a."data_insercao", a."id") < (b."data_insercao", b."id");--> statement-breakpoint

-- Um codigo (ou EAN) do fornecedor aponta para um unico produto. Torna o upsert possivel e impede
-- que o Estagio A do matching escolha um vencedor arbitrario entre duplicatas.
CREATE UNIQUE INDEX IF NOT EXISTS "unq_supplier_product_mappings_fornecedor_codigo"
	ON "ampmais_supplier_product_mappings" ("fornecedor_id", "codigo_fornecedor")
	WHERE "codigo_fornecedor" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "unq_supplier_product_mappings_fornecedor_ean"
	ON "ampmais_supplier_product_mappings" ("fornecedor_id", "ean")
	WHERE "ean" IS NOT NULL;--> statement-breakpoint

-- Unidade e fator de conversao aprendidos por item: a proxima nota do mesmo fornecedor ja chega
-- com a conversao preenchida.
ALTER TABLE "ampmais_supplier_product_mappings" ADD COLUMN IF NOT EXISTS "unidade_externa" varchar(25);--> statement-breakpoint
ALTER TABLE "ampmais_supplier_product_mappings" ADD COLUMN IF NOT EXISTS "fator_conversao" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_supplier_product_mappings" ADD COLUMN IF NOT EXISTS "data_atualizacao" timestamp DEFAULT now() NOT NULL;
