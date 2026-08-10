-- Composição de custo da compra e partidas dobradas por linha.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0072_purchase_cost_composition.sql
-- Idempotente.
--
-- ATENCAO: aplicar ANTES do deploy do codigo. `persistPurchaseItemRow` grava as tres colunas novas
-- de purchase_items em toda gravacao de compra, entao sem esta migracao nenhuma compra salva.
--
-- Contexto: docs/domain/purchase-costing.md e docs/adr/0001.
--   modificadores_custo  snapshot versionado do que explica a diferenca entre mercadoria, financeiro
--                        e custo. O tratamento de cada modificador (nao a sua chave) decide o destino.
--   valor_total_custo    projecao exata consumida pelo estoque; o downstream nao interpreta o JSONB.
--   documentos_importados snapshot documental da compra. Nao guarda caminho de arquivo: o objeto e
--                        localizado por `referencia` + organizacao (lib/purchase/imported-documents.ts).
--
-- accounting_entry_lines fica atras da flag ACCOUNTING_ENTRY_LINES_ENABLED. Criar a tabela antes de
-- ligar a flag e deliberado: o backfill precisa dela para popular os lancamentos historicos.

DO $$ BEGIN
	CREATE TYPE "accounting_entry_line_nature" AS ENUM ('DEBITO', 'CREDITO');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ampmais_accounting_entry_lines" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"lancamento_contabil_id" varchar(255) NOT NULL,
	"conta_contabil_id" varchar(255) NOT NULL,
	"natureza" "accounting_entry_line_nature" NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"valor_previsto" numeric(14, 2),
	"descricao" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"metadados" jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "ampmais_accounting_entry_lines"
		ADD CONSTRAINT "ampmais_accounting_entry_lines_organizacao_id_ampmais_organizations_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_accounting_entry_lines"
		ADD CONSTRAINT "ampmais_accounting_entry_lines_lancamento_contabil_id_ampmais_accounting_entries_id_fk"
		FOREIGN KEY ("lancamento_contabil_id") REFERENCES "public"."ampmais_accounting_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_accounting_entry_lines"
		ADD CONSTRAINT "ampmais_accounting_entry_lines_conta_contabil_id_ampmais_accounts_charts_id_fk"
		FOREIGN KEY ("conta_contabil_id") REFERENCES "public"."ampmais_accounts_charts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_accounting_entry_lines_organizacao_id" ON "ampmais_accounting_entry_lines" ("organizacao_id");
CREATE INDEX IF NOT EXISTS "idx_accounting_entry_lines_lancamento_id" ON "ampmais_accounting_entry_lines" ("lancamento_contabil_id");
CREATE INDEX IF NOT EXISTS "idx_accounting_entry_lines_conta_id" ON "ampmais_accounting_entry_lines" ("conta_contabil_id");

ALTER TABLE "ampmais_purchases" ADD COLUMN IF NOT EXISTS "documentos_importados" jsonb;

ALTER TABLE "ampmais_purchase_items" ADD COLUMN IF NOT EXISTS "modificadores_custo" jsonb;
ALTER TABLE "ampmais_purchase_items" ADD COLUMN IF NOT EXISTS "valor_total_custo" numeric(14, 2);
ALTER TABLE "ampmais_purchase_items" ADD COLUMN IF NOT EXISTS "valor_unitario_custo" numeric(18, 6);

-- Itens historicos nao tem modificadores: o custo de estoque deles e o proprio valor liquido ja
-- praticado. Preencher aqui evita que `resolveUnitCost` caia no fallback e mude o custo medio de
-- lotes antigos por um caminho diferente do que a compra usou na epoca.
UPDATE "ampmais_purchase_items"
SET "valor_total_custo" = COALESCE("valor_total_liquido", "valor_total_bruto"),
    "valor_unitario_custo" = COALESCE("valor_unitario_liquido", "valor_unitario_bruto")
WHERE "valor_total_custo" IS NULL
  AND "modificadores_custo" IS NULL;
