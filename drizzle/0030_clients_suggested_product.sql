-- Produto sugerido (cross-sell) por cliente, denormalizado e computado pelo cron product-client-references.
-- Aditivo: coluna nullable, sem impacto em linhas existentes.
ALTER TABLE "ampmais_clients" ADD COLUMN "metadata_produto_sugerido_id" varchar(255);
