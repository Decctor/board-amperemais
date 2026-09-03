-- Registra a classificação presencial excepcional usada em emissões manuais de vendas com entrega.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0092_exceptional_fiscal_presence.sql
-- Idempotente e seguro para reexecução após falha parcial.

ALTER TYPE "public"."fiscal_document_event_type"
	ADD VALUE IF NOT EXISTS 'CLASSIFICACAO_PRESENCA_EXCEPCIONAL';

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "presenca_consumidor_declarada" "fiscal_operation_consumer_presence";

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "justificativa_presenca_consumidor" text;

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "autor_presenca_consumidor_id" varchar(255);

ALTER TABLE "ampmais_fiscal_outbound_documents"
	ADD COLUMN IF NOT EXISTS "data_declaracao_presenca_consumidor" timestamp;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'fiscal_outbound_docs_presence_author_fk'
	) THEN
		ALTER TABLE "ampmais_fiscal_outbound_documents"
			ADD CONSTRAINT "fiscal_outbound_docs_presence_author_fk"
			FOREIGN KEY ("autor_presenca_consumidor_id")
			REFERENCES "public"."ampmais_users"("id")
			ON DELETE SET NULL;
	END IF;
END $$;
