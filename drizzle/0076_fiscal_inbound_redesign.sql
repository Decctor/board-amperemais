-- Redesign do módulo de notas recebidas (fiscal inbound) — docs/dev-planning/fiscal-inbound-redesign-plan.md
-- Módulo sem dados relevantes em produção: drop/recreate destrutivo das duas tabelas.
-- APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0076_fiscal_inbound_redesign.sql

DO $$ BEGIN
	CREATE TYPE "public"."fiscal_inbound_situacao" AS ENUM('AUTORIZADA', 'DENEGADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TABLE IF EXISTS "ampmais_fiscal_inbound_documents";
DROP TABLE IF EXISTS "ampmais_fiscal_inbound_cursors";
DROP TABLE IF EXISTS "ampmais_fiscal_inbound_sync_states";

CREATE TABLE "ampmais_fiscal_inbound_documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"fornecedor_id" varchar(255),
	"chave_acesso" varchar(44) NOT NULL,
	"provedor" "fiscal_provider" NOT NULL DEFAULT 'MANUAL',
	"provedor_documento_id" varchar(255),
	"completo" boolean NOT NULL DEFAULT false,
	"situacao" "fiscal_inbound_situacao",
	"emitente_cnpj" varchar(20),
	"emitente_nome" varchar(255),
	"valor_total" double precision,
	"data_emissao" timestamp,
	"manifestacao_atual" "fiscal_inbound_manifest_event",
	"manifestacao_protocolo" varchar(60),
	"manifestacao_data" timestamp,
	"manifestacao_justificativa" varchar(255),
	"xml_storage_path" varchar(500),
	"pdf_storage_path" varchar(500),
	"eventos_payload" text,
	"resumo_payload" text,
	"compra_id" varchar(255),
	"data_insercao" timestamp NOT NULL DEFAULT now(),
	"data_atualizacao" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "ampmais_fiscal_inbound_sync_states" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"checkpoint" text,
	"ultima_sincronizacao" timestamp,
	"proxima_sincronizacao_permitida" timestamp,
	"ultimo_desfecho" varchar(60),
	"ultima_mensagem" text,
	"data_atualizacao" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
	ALTER TABLE "ampmais_fiscal_inbound_documents"
		ADD CONSTRAINT "ampmais_fiscal_inbound_documents_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_fiscal_inbound_documents"
		ADD CONSTRAINT "ampmais_fiscal_inbound_documents_fornecedor_id_fk"
		FOREIGN KEY ("fornecedor_id") REFERENCES "ampmais_suppliers"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_fiscal_inbound_documents"
		ADD CONSTRAINT "ampmais_fiscal_inbound_documents_compra_id_fk"
		FOREIGN KEY ("compra_id") REFERENCES "ampmais_purchases"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_fiscal_inbound_sync_states"
		ADD CONSTRAINT "ampmais_fiscal_inbound_sync_states_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX "idx_fiscal_inbound_documents_organizacao_id"
	ON "ampmais_fiscal_inbound_documents" ("organizacao_id");
-- Dedupe de notas recebidas: uma chave de acesso por organizacao (cron e webhook podem correr).
CREATE UNIQUE INDEX "uq_fiscal_inbound_documents_organizacao_chave"
	ON "ampmais_fiscal_inbound_documents" ("organizacao_id", "chave_acesso");
CREATE UNIQUE INDEX "uq_fiscal_inbound_documents_organizacao_provedor_doc"
	ON "ampmais_fiscal_inbound_documents" ("organizacao_id", "provedor_documento_id")
	WHERE "provedor_documento_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_fiscal_inbound_sync_states_organizacao_id"
	ON "ampmais_fiscal_inbound_sync_states" ("organizacao_id");
