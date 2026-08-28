-- Fundação de acesso para agentes de IA (MCP). Torna a organização opcional no principal,
-- mantendo-a obrigatória para todo tipo que não seja de plataforma.
-- PRÉ-REQUISITO: drizzle/0084_agent_principal_type.sql precisa ter sido aplicado e commitado —
-- a CHECK abaixo referencia o valor de enum criado lá.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0085_agent_access_foundation.sql
-- Idempotente (IF NOT EXISTS / DROP NOT NULL é no-op quando já aplicado).

-- A garantia sai do NOT NULL e vai para a CHECK: o isolamento multi-tenant não afrouxa,
-- só passa a ter uma exceção nomeada.
ALTER TABLE ampmais_access_principals ALTER COLUMN organizacao_id DROP NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'chk_access_principals_organizacao'
	) THEN
		ALTER TABLE ampmais_access_principals
			ADD CONSTRAINT chk_access_principals_organizacao
			CHECK (organizacao_id IS NOT NULL OR tipo = 'CONTA_PLATAFORMA');
	END IF;
END $$;

-- Índice para o rate limiting por principal do endpoint MCP (janela recente de chamadas).
-- O índice existente é (tipo, endereco_ip, data_insercao) e não serve a esta contagem.
CREATE INDEX IF NOT EXISTS idx_access_events_principal_tipo_data
	ON ampmais_access_events (principal_id, tipo, data_insercao);
