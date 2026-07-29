-- Chats — Estatisticas e Quadro (docs/dev-planning/chats-analytics-kanban-plan.md, secao 8)
-- DDL ADITIVO, so indices. Seguro de aplicar com o codigo atual em producao.
-- Aplicado via scripts/apply-sql-migration.ts.
--
-- ATENCAO: o runner envolve o arquivo inteiro em uma transacao, e CREATE INDEX CONCURRENTLY
-- nao roda dentro de transacao — por isso os indices abaixo sao criados no modo normal, que
-- pega SHARE lock e bloqueia escrita na tabela enquanto constroi. Em ampmais_chat_messages
-- isso pode ser sensivel: se o volume da instancia tornar o lock inaceitavel, pular este
-- arquivo no runner e aplicar manualmente, um a um, trocando por CONCURRENTLY:
--   psql "$SUPABASE_DB_URL" -c 'CREATE INDEX CONCURRENTLY IF NOT EXISTS ... ;'
--
-- Os indices existentes cobrem acesso por chat (idx_chat_assignments_chat_status) e por
-- responsavel (idx_chat_assignments_organizacao_usuario). Nenhum cobre varredura por
-- organizacao + janela de datas, que e o padrao de acesso da aba de estatisticas inteira.

-- ─── 1. Atendimentos abertos no periodo ─────────────────────────────────────
-- data_insercao, e nao data_atribuicao: esta ultima e reescrita a cada assumir/atribuir/
-- transferir e portanto significa "o dono atual e dono desde", nao "o atendimento abriu em".
CREATE INDEX IF NOT EXISTS "idx_chat_assignments_org_data_insercao"
	ON "ampmais_chat_assignments" ("organizacao_id", "data_insercao" DESC);

-- ─── 2. Atendimentos encerrados no periodo ──────────────────────────────────
-- Parcial: a maioria das linhas tem data_encerramento nula (atendimentos vivos), e elas
-- nunca sao alvo desta consulta.
CREATE INDEX IF NOT EXISTS "idx_chat_assignments_org_data_encerramento"
	ON "ampmais_chat_assignments" ("organizacao_id", "data_encerramento" DESC)
	WHERE "data_encerramento" IS NOT NULL;

-- ─── 3. Retrato da fila e colunas do quadro ─────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_chat_assignments_org_status"
	ON "ampmais_chat_assignments" ("organizacao_id", "status");

-- O volume de mensagens por periodo (KPIs, serie diaria, heatmap) ja e coberto por
-- idx_chat_messages_organizacao_data_envio, criado na 0052. Nada a fazer aqui.
