ALTER TABLE "ampmais_accounting_entries"
	ADD COLUMN IF NOT EXISTS "chave_idempotencia" varchar(120);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_accounting_entries_organizacao_idempotency_key"
	ON "ampmais_accounting_entries" ("organizacao_id", "chave_idempotencia");
