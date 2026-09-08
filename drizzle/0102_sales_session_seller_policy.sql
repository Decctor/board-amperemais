CREATE TYPE "public"."sales_session_policy" AS ENUM('VENDEDOR_UNICO', 'VENDEDORES_MULTIPLOS');

ALTER TABLE "ampmais_sales_sessions"
	ADD COLUMN "politica" "sales_session_policy" DEFAULT 'VENDEDOR_UNICO' NOT NULL,
	ADD COLUMN "vendedor_padrao_id" varchar(255);

UPDATE "ampmais_sales_sessions" SET "vendedor_padrao_id" = "responsavel_vendedor_id";

ALTER TABLE "ampmais_sales_sessions"
	ADD CONSTRAINT "ampmais_sales_sessions_vendedor_padrao_id_ampmais_sellers_id_fk"
	FOREIGN KEY ("vendedor_padrao_id") REFERENCES "public"."ampmais_sellers"("id") ON DELETE set null ON UPDATE no action;

DROP INDEX IF EXISTS "uq_sales_sessions_aberta";
DROP INDEX IF EXISTS "idx_sales_sessions_responsavel";

ALTER TABLE "ampmais_sales_sessions"
	DROP CONSTRAINT IF EXISTS "ampmais_sales_sessions_responsavel_vendedor_id_ampmais_sellers_id_fk",
	DROP COLUMN "responsavel_vendedor_id",
	DROP COLUMN "escopo_chave";

CREATE INDEX "idx_sales_sessions_vendedor_padrao" ON "ampmais_sales_sessions" USING btree ("vendedor_padrao_id");
CREATE UNIQUE INDEX "uq_sales_sessions_vendedor_unico_aberta"
	ON "ampmais_sales_sessions" USING btree ("organizacao_id", "vendedor_padrao_id")
	WHERE "status" = 'ABERTA' AND "politica" = 'VENDEDOR_UNICO';

CREATE UNIQUE INDEX "uq_sales_session_reconciliations_sessao_metodo"
	ON "ampmais_sales_session_reconciliations" USING btree ("sessao_venda_id", "metodo");
