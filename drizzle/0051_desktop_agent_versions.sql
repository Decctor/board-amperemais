-- Versoes distribuiveis do agente desktop (recompra-local-agent).
-- DDL aditivo. Aplicado via scripts/apply-sql-migration.ts (drizzle push/generate travam em prompts de drift).
--
-- NAO e escopada por organizacao de proposito: o instalador e um artefato da
-- plataforma. Quem publica e o superusuario (users.admin), nao o admin de uma loja.
--
-- A linha e criada pelo CI do repo recompra-local-agent
-- (packaging/publish-supabase.ps1), ja com o binario no bucket `files`, e sempre
-- com publicada = false. Promover e ato humano na aba do admin-dashboard.

CREATE TABLE "ampmais_desktop_agent_versions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	-- Semver sem o "v" (ex.: 0.1.0). O caminho no Storage deriva dele, dai o UNIQUE.
	"versao" varchar(20) NOT NULL,
	-- Mesmo hash anexado a Release do GitHub: torna verificavel que o arquivo no
	-- Storage e o arquivo arquivado sao o mesmo binario.
	"sha256" varchar(64) NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	-- Caminho imutavel por versao no bucket: publicar aponta uma linha e nunca
	-- move bytes, entao rollback nao reconstroi nada.
	"storage_path" text NOT NULL,
	"notas" text,
	"publicada" boolean DEFAULT false NOT NULL,
	"publicada_por_id" varchar(255),
	"data_publicacao" timestamp,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_desktop_agent_versions_publicada_por_id_fk" FOREIGN KEY ("publicada_por_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE UNIQUE INDEX "idx_desktop_agent_versions_versao" ON "ampmais_desktop_agent_versions" ("versao");
CREATE INDEX "idx_desktop_agent_versions_publicada" ON "ampmais_desktop_agent_versions" ("publicada");

-- No maximo uma versao publicada por vez. E o banco que garante, e nao a rota:
-- publicar e despublicar acontecem em transacoes separadas e um erro no meio
-- deixaria duas publicadas, que a tela de DISPOSITIVOS leria como ambiguidade.
CREATE UNIQUE INDEX "idx_desktop_agent_versions_publicada_unica" ON "ampmais_desktop_agent_versions" ("publicada") WHERE "publicada" = true;
