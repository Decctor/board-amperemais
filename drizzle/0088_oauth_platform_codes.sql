-- Consentimento OAuth de plataforma: um admin (users.admin) pode autorizar um conector MCP com
-- acesso de plataforma, e o código de autorização passa a admitir organizacao_id nulo — mesmo
-- racional do organizacao_id nulo em ampmais_access_principals (CONTA_PLATAFORMA). Não há CHECK
-- adicional porque a própria nulidade É o modo plataforma; quem impõe o gate é a rota de
-- aprovação (admin) e o teto de scopes do catálogo.
-- PRÉ-REQUISITO: drizzle/0087_oauth_authorization.sql aplicado.
-- PÓS-DEPLOY: npm run seed:access-clients (teto platform:* em AGENT_CLAUDE/AGENT_CHATGPT).
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0088_oauth_platform_codes.sql
-- Idempotente (DROP NOT NULL é no-op quando já aplicado).

ALTER TABLE "ampmais_access_oauth_authorization_codes" ALTER COLUMN "organizacao_id" DROP NOT NULL;
