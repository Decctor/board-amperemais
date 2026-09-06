-- Aplicação manual; não executar durante build/deploy.
CREATE TYPE import_job_state AS ENUM ('AGUARDANDO','EM_ANDAMENTO','PAUSADO_LIMITE','AGUARDANDO_RECONEXAO','CONCLUIDO','CONCLUIDO_COM_LACUNAS','FALHOU','CANCELADO');
CREATE TYPE import_job_type AS ENUM ('HISTORICO');
CREATE TABLE ampmais_integration_import_jobs (
 id varchar(255) PRIMARY KEY,
 organizacao_id varchar(255) NOT NULL REFERENCES ampmais_organizations(id) ON DELETE CASCADE,
 integracao_id varchar(255) NOT NULL REFERENCES ampmais_integrations(id) ON DELETE RESTRICT,
 tipo import_job_type NOT NULL DEFAULT 'HISTORICO',
 estado import_job_state NOT NULL DEFAULT 'AGUARDANDO',
 janela_alvo_inicio timestamp NOT NULL, janela_alvo_fim timestamp NOT NULL,
 cobertura_inicio timestamp, cursor_janela_inicio timestamp, cursor_janela_fim timestamp,
 cursor_pagina integer NOT NULL DEFAULT 1, listagem_concluida boolean NOT NULL DEFAULT false,
 cursor_pendentes jsonb NOT NULL DEFAULT '[]', janelas_com_falha jsonb NOT NULL DEFAULT '[]',
 contadores jsonb NOT NULL DEFAULT '{"listados":0,"elegiveis":0,"ignoradosPorSituacao":0,"situacoesDesconhecidas":0,"importados":0,"atualizados":0,"clientesCriados":0,"requisicoes":0,"rateLimits":0}',
 cache jsonb NOT NULL DEFAULT '{}', proxima_execucao timestamp DEFAULT now(), lock_ate timestamp,
 tentativas_consecutivas integer NOT NULL DEFAULT 0, ultimo_erro text, ultima_execucao timestamp,
 data_inicio timestamp NOT NULL DEFAULT now(), data_conclusao timestamp,
 autor_id varchar(255) REFERENCES ampmais_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_import_jobs_org ON ampmais_integration_import_jobs(organizacao_id);
-- Server-side Drizzle access only; organization authorization is enforced by the app.
ALTER TABLE ampmais_integration_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_import_jobs_runnable ON ampmais_integration_import_jobs(estado, proxima_execucao);
CREATE UNIQUE INDEX idx_import_jobs_active_integration ON ampmais_integration_import_jobs(integracao_id)
 WHERE estado IN ('AGUARDANDO','EM_ANDAMENTO','PAUSADO_LIMITE','AGUARDANDO_RECONEXAO');
