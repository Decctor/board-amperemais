-- Modificadores monetários das transações financeiras.
-- O valor persistido continua sendo o total: base + juros + multa + taxas - desconto.

ALTER TABLE "ampmais_financial_transactions"
	ADD COLUMN IF NOT EXISTS "valor_base" double precision NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "valor_juros" double precision NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "valor_multa" double precision NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "valor_taxas" double precision NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "valor_desconto" double precision NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "modificadores_metadata" jsonb;

UPDATE "ampmais_financial_transactions"
SET "valor_base" = "valor"
WHERE "valor_base" = 0
	AND "valor_juros" = 0
	AND "valor_multa" = 0
	AND "valor_taxas" = 0
	AND "valor_desconto" = 0;
