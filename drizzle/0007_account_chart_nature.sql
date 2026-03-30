CREATE TYPE "public"."account_chart_nature" AS ENUM('ATIVO', 'PASSIVO', 'PATRIMONIO_LIQUIDO', 'RECEITA', 'CUSTO', 'DESPESA');
ALTER TABLE "ampmais_accounts_charts" ADD COLUMN "natureza" "account_chart_nature";
UPDATE "ampmais_accounts_charts"
SET "natureza" = CASE
	WHEN "codigo" LIKE '1%' OR upper("nome") LIKE 'ATIVO%' THEN 'ATIVO'::"account_chart_nature"
	WHEN "codigo" LIKE '2%' OR upper("nome") LIKE 'PASSIVO%' OR upper("nome") LIKE 'FORNECEDOR%' THEN 'PASSIVO'::"account_chart_nature"
	WHEN "codigo" LIKE '3%' OR upper("nome") LIKE 'PATRIMON%' THEN 'PATRIMONIO_LIQUIDO'::"account_chart_nature"
	WHEN "codigo" LIKE '4%' OR upper("nome") LIKE 'RECEITA%' THEN 'RECEITA'::"account_chart_nature"
	WHEN "codigo" LIKE '5%' OR upper("nome") LIKE 'CUSTO%' THEN 'CUSTO'::"account_chart_nature"
	WHEN "codigo" LIKE '6%' OR upper("nome") LIKE 'DESPESA%' THEN 'DESPESA'::"account_chart_nature"
	ELSE 'ATIVO'::"account_chart_nature"
END;
ALTER TABLE "ampmais_accounts_charts" ALTER COLUMN "natureza" SET NOT NULL;
CREATE INDEX "idx_accounts_charts_natureza" ON "ampmais_accounts_charts" USING btree ("organizacao_id","natureza");
