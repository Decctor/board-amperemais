-- Torna atualizacoes do provedor fiscal rastreaveis, ordenaveis e idempotentes.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0095_fiscal_provider_snapshot_ordering.sql
-- Idempotente e seguro para reexecucao.

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "provedor_processado_em" timestamp;

ALTER TABLE "ampmais_fiscal_document_events"
	ADD COLUMN IF NOT EXISTS "origem" varchar(40),
	ADD COLUMN IF NOT EXISTS "provedor_evento_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_fiscal_document_events_provedor_evento_id"
	ON "ampmais_fiscal_document_events" ("provedor_evento_id")
	WHERE "provedor_evento_id" IS NOT NULL;
