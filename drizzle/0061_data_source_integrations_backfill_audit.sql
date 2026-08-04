-- Migração de fontes de dados — AUDITORIA PRÉ-BACKFILL (rodar e guardar o resultado ANTES da 0062).
-- Somente SELECTs; não altera nada. Rodar num client SQL (o apply-sql-migration não exibe linhas).

-- 1. Organizações com integração coerente (elegíveis ao backfill de `integrations`).
SELECT o.id, o.nome, o.integracao_tipo
FROM ampmais_organizations o
WHERE o.integracao_tipo IS NOT NULL
	AND o.integracao_configuracao IS NOT NULL
	AND (o.integracao_configuracao->>'tipo') = o.integracao_tipo::text;

-- 2. Organizações INCOERENTES (config nula ou tipo divergente) — já invisíveis para o cron hoje.
-- NÃO são backfilladas em `integrations`; para o POI recebem registroAtivo=false (o
-- integracao_tipo preenchido bloqueia o POI hoje, mesmo com config quebrada). Tratar caso a caso.
SELECT o.id, o.nome, o.integracao_tipo,
	(o.integracao_configuracao IS NULL) AS config_nula,
	(o.integracao_configuracao->>'tipo') AS config_tipo
FROM ampmais_organizations o
WHERE o.integracao_tipo IS NOT NULL
	AND (o.integracao_configuracao IS NULL OR (o.integracao_configuracao->>'tipo') IS DISTINCT FROM o.integracao_tipo::text);

-- 3. Prévia da atribuição de vendas (D4): organizações com exatamente UMA fonte candidata e a
-- contagem de vendas sem atribuição que o UPDATE tocaria. Rodar DEPOIS do insert em
-- `integrations` (0062 passo 1) e ANTES do UPDATE de vendas (0062 passo 2) — ou simplesmente
-- comparar com o resultado pós-0062.
WITH fonte_unica AS (
	SELECT i.organizacao_id, MIN(i.id) AS integracao_id
	FROM ampmais_integrations i
	WHERE i.ativo = true
		AND i.tipo::text IN ('ONLINE-SOFTWARE', 'CARDAPIO-WEB', 'NUVEM-SHOP', 'IFOOD', 'BLING')
	GROUP BY i.organizacao_id
	HAVING COUNT(*) = 1
)
SELECT f.organizacao_id, f.integracao_id, COUNT(s.id) AS vendas_sem_atribuicao
FROM fonte_unica f
LEFT JOIN ampmais_sales s ON s.organizacao_id = f.organizacao_id AND s.integracao_id IS NULL
GROUP BY f.organizacao_id, f.integracao_id
ORDER BY vendas_sem_atribuicao DESC;

-- 4. Organizações com MAIS de uma fonte candidata (não devem existir antes do multi-fonte;
-- qualquer linha aqui precisa de explicação antes da Fase 2 — sem atribuição automática).
SELECT i.organizacao_id, COUNT(*) AS fontes_ativas
FROM ampmais_integrations i
WHERE i.ativo = true
	AND i.tipo::text IN ('ONLINE-SOFTWARE', 'CARDAPIO-WEB', 'NUVEM-SHOP', 'IFOOD', 'BLING')
GROUP BY i.organizacao_id
HAVING COUNT(*) > 1;

-- 5. Snapshot do gate do POI (D8): o backfill deve resultar em registroAtivo = (integracao_tipo IS NULL).
SELECT (integracao_tipo IS NULL) AS poi_registro_esperado, COUNT(*)
FROM ampmais_organizations
GROUP BY 1;
