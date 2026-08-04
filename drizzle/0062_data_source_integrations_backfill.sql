-- Migração de fontes de dados — Fase 1: BACKFILL (idempotente, re-rodável).
-- Pré-requisitos: 0059 (enum) e 0060 (colunas) aplicadas; auditoria 0061 executada e revisada.
-- Executar IMEDIATAMENTE ANTES do deploy da Fase 2 para minimizar a janela de tokens divergentes
-- (um refresh de token entre backfill e deploy deixa o token novo só na org — risco R6; para
-- IFOOD, cujo refreshToken rotaciona, re-rodar o passo 1 com DELETE prévio da linha afetada ou
-- aceitar 1 ciclo de erro + reconexão).
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0062_data_source_integrations_backfill.sql

-- 1. Uma linha em `integrations` por organização com integração coerente. O jsonb é copiado
-- byte a byte (o discriminante `tipo` já bate — D1). Orgs incoerentes ficam de fora (auditoria
-- 0061 §2). Guard NOT EXISTS torna re-rodável sem duplicar.
INSERT INTO ampmais_integrations
	(id, organizacao_id, tipo, ativo, apelido, ref_externo, configuracao, status, data_insercao)
SELECT
	gen_random_uuid(),
	o.id,
	o.integracao_tipo::text::integration_type,
	true,
	NULL,
	CASE o.integracao_tipo::text
		WHEN 'NUVEM-SHOP'   THEN (o.integracao_configuracao->>'storeId')
		WHEN 'CARDAPIO-WEB' THEN (o.integracao_configuracao->>'merchantId')
		ELSE NULL
	END,
	o.integracao_configuracao,
	'CONECTADO',
	now()
FROM ampmais_organizations o
WHERE o.integracao_tipo IS NOT NULL
	AND o.integracao_configuracao IS NOT NULL
	AND (o.integracao_configuracao->>'tipo') = o.integracao_tipo::text
	AND NOT EXISTS (
		SELECT 1 FROM ampmais_integrations i
		WHERE i.organizacao_id = o.id AND i.tipo::text = o.integracao_tipo::text
	);

-- 2. Proveniência das vendas (D4). Premissa de produção: antes do multi-fonte, todas as vendas
-- de uma organização com integração pertencem à única integração atual. Só organizações com
-- EXATAMENTE uma fonte ativa entram; nenhuma atribuição existente é sobrescrita.
WITH fonte_unica AS (
	SELECT
		i.organizacao_id,
		MIN(i.id) AS integracao_id
	FROM ampmais_integrations i
	WHERE i.ativo = true
		AND i.tipo::text IN (
			'ONLINE-SOFTWARE', 'CARDAPIO-WEB', 'NUVEM-SHOP', 'IFOOD', 'BLING'
		)
	GROUP BY i.organizacao_id
	HAVING COUNT(*) = 1
)
UPDATE ampmais_sales s
SET integracao_id = f.integracao_id
FROM fonte_unica f
WHERE s.organizacao_id = f.organizacao_id
	AND s.integracao_id IS NULL;

-- 3. Gate do POI (D8) — snapshot do comportamento atual: registra vendas ⇔ org sem integração.
-- Orgs incoerentes (tipo preenchido, config quebrada) recebem registroAtivo=false — coerente com
-- o comportamento vigente (o integracao_tipo preenchido bloqueia o POI hoje).
UPDATE ampmais_organizations
SET poi_configuracao = jsonb_build_object(
	'vendas', jsonb_build_object('registroAtivo', integracao_tipo IS NULL)
)
WHERE poi_configuracao IS NULL;

-- Pós-checagem (comparar com auditoria 0061): contagens de vendas atribuídas × ainda nulas por
-- organização elegível; qualquer divergência precisa ser explicada antes da Fase 2.
