-- Distingue uma emissao aceita e ainda em processamento de uma falha real no historico fiscal.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0094_fiscal_processing_started_event.sql
-- Idempotente e seguro para reexecucao.

ALTER TYPE "public"."fiscal_document_event_type"
	ADD VALUE IF NOT EXISTS 'PROCESSAMENTO_INICIADO';
