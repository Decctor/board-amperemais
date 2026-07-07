-- Estado do envio de conversão (Purchase) ao Conversions API da Meta, gravado na própria venda
-- (dedup/observabilidade/retry). Sem tabela dedicada: 1 venda = 1 evento Purchase.
-- Índice parcial p/ o cron varrer pendentes/falhas sem escanear a tabela inteira.
ALTER TABLE "ampmais_sales" ADD COLUMN "capi_metadados" jsonb;--> statement-breakpoint
CREATE INDEX "idx_sales_capi_status" ON "ampmais_sales" USING btree (("capi_metadados"->>'status')) WHERE "capi_metadados" IS NOT NULL;
