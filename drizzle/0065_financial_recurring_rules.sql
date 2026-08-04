-- Regras de recorrência para materialização idempotente de lançamentos contábeis.
-- Aplicar manualmente antes do deploy do código da recorrência.

CREATE TABLE IF NOT EXISTS "ampmais_financial_recurring_rules" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"autor_id" varchar(255),
	"lancamento_contabil_origem_id" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'ATIVA',
	"config" jsonb NOT NULL,
	"template_lancamento" jsonb NOT NULL,
	"template_transacoes" jsonb NOT NULL,
	"proxima_geracao_em" timestamp,
	"ultima_geracao_em" timestamp,
	"gerar_ate" timestamp,
	"data_insercao" timestamp NOT NULL DEFAULT now(),
	"atualizado_em" timestamp
);

ALTER TABLE "ampmais_accounting_entries"
	ADD COLUMN IF NOT EXISTS "recorrencia_regra_id" varchar(255),
	ADD COLUMN IF NOT EXISTS "recorrencia_instancia_data" timestamp,
	ADD COLUMN IF NOT EXISTS "recorrencia_gerado_em" timestamp;

DO $$ BEGIN
	ALTER TABLE "ampmais_financial_recurring_rules"
		ADD CONSTRAINT "ampmais_financial_recurring_rules_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_financial_recurring_rules"
		ADD CONSTRAINT "ampmais_financial_recurring_rules_autor_id_fk"
		FOREIGN KEY ("autor_id") REFERENCES "ampmais_users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_financial_recurring_rules"
		ADD CONSTRAINT "ampmais_financial_recurring_rules_origem_fk"
		FOREIGN KEY ("lancamento_contabil_origem_id") REFERENCES "ampmais_accounting_entries"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "ampmais_accounting_entries"
		ADD CONSTRAINT "ampmais_accounting_entries_recorrencia_regra_fk"
		FOREIGN KEY ("recorrencia_regra_id") REFERENCES "ampmais_financial_recurring_rules"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_financial_recurring_rules_organizacao_status"
	ON "ampmais_financial_recurring_rules" ("organizacao_id", "status");
CREATE INDEX IF NOT EXISTS "idx_financial_recurring_rules_proxima_geracao"
	ON "ampmais_financial_recurring_rules" ("proxima_geracao_em");
CREATE INDEX IF NOT EXISTS "idx_financial_recurring_rules_origem"
	ON "ampmais_financial_recurring_rules" ("lancamento_contabil_origem_id");
CREATE INDEX IF NOT EXISTS "idx_accounting_entries_recorrencia_regra"
	ON "ampmais_accounting_entries" ("recorrencia_regra_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_accounting_entries_recurrence_instance"
	ON "ampmais_accounting_entries" ("recorrencia_regra_id", "recorrencia_instancia_data")
	WHERE "recorrencia_regra_id" IS NOT NULL AND "recorrencia_instancia_data" IS NOT NULL;
