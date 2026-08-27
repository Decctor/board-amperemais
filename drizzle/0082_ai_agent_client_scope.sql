-- Escopo de clientes do agente de IA — docs/dev-planning/ai-agent-client-scope-plan.md
-- Aditiva e preservadora de comportamento: o default TODOS reproduz exatamente o comportamento
-- atual (agente atende todo mundo) para toda organização existente.
-- Coluna própria, e não um campo dentro de `capacidades`, porque `capacidades` é copiada para
-- `ai_agent_runs.config_snapshot` em toda run — uma lista de clientes ali seria duplicada para
-- sempre, sem nenhum ganho de auditoria.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0082_ai_agent_client_scope.sql
-- Idempotente (IF NOT EXISTS).

ALTER TABLE ampmais_ai_agents
	ADD COLUMN IF NOT EXISTS escopo jsonb NOT NULL DEFAULT '{"tipo":"TODOS","clienteIds":[]}'::jsonb;
