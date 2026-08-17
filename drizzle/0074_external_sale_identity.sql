-- Aplicar somente depois de executar `npm run backfill:online-software-sales -- --org=<id> --apply`
-- para organizacoes que ja possuam duplicatas legadas.
CREATE UNIQUE INDEX "idx_sales_org_integration_external_unique"
	ON "ampmais_sales" USING btree ("organizacao_id", "integracao_id", "id_externo")
	WHERE "integracao_id" IS NOT NULL;
