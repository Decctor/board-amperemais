-- Responsável humano pelas mutações executadas por uma conexão MCP.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0086_mcp_mutation_responsible_user.sql

ALTER TABLE ampmais_access_principals
	ADD COLUMN IF NOT EXISTS responsavel_usuario_id varchar(255);

DO $$ BEGIN
	ALTER TABLE ampmais_access_principals
		ADD CONSTRAINT ampmais_access_principals_responsavel_usuario_id_ampmais_users_id_fk
		FOREIGN KEY (responsavel_usuario_id) REFERENCES ampmais_users(id) ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_access_principals_responsavel_usuario_id
	ON ampmais_access_principals (responsavel_usuario_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_access_events_agent_operation_idempotency
	ON ampmais_access_events (principal_id, (metadados->>'ferramenta'), (metadados->>'chaveIdempotencia'))
	WHERE tipo = 'OPERACAO_AGENTE';
