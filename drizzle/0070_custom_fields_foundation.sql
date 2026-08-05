-- Campos personalizados — fundação (definições genéricas por entidade + valores por cliente).
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0070_custom_fields_foundation.sql
-- Idempotente.
--
-- A definição é genérica por `entidade` (hoje só CLIENTE) para que estender a produto/venda
-- seja um ALTER TYPE. O valor é concreto por entidade — uma tabela por dono, com FK real —
-- porque um `entidade_id` genérico não teria integridade referencial e deixaria valores órfãos.
--
-- `chave_nativa` separa os dois tipos de campo: não nula = campo do catálogo de fábrica
-- (lib/custom-fields/native-catalog.ts), que a plataforma interpreta; nula = campo criado pela
-- organização, que a plataforma armazena mas não interpreta.

DO $$ BEGIN
	CREATE TYPE "custom_field_entity" AS ENUM ('CLIENTE');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	CREATE TYPE "custom_field_type" AS ENUM ('ESCOLHA_UNICA', 'ESCOLHA_MULTIPLA', 'TEXTO', 'NUMERO', 'DATA');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ampmais_custom_fields" (
	"id" varchar(255) PRIMARY KEY,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE CASCADE,
	"entidade" "custom_field_entity" NOT NULL DEFAULT 'CLIENTE',
	-- Chave kebab-case do catálogo nativo; NULL para campos próprios da organização.
	"chave_nativa" text,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" "custom_field_type" NOT NULL,
	-- [{ valor, titulo, legenda?, icone? }] — só para os tipos de escolha.
	"opcoes" jsonb,
	"ativo" boolean NOT NULL DEFAULT true,
	"data_insercao" timestamp NOT NULL DEFAULT now(),
	"data_atualizacao" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_custom_fields_organizacao_entidade" ON "ampmais_custom_fields" ("organizacao_id", "entidade");

-- Um campo nativo existe no máximo uma vez por organização. Parcial porque `chave_nativa` é nula
-- nos campos próprios, e no Postgres NULL nunca conflita — deixar explícito evita a falsa
-- impressão de que campos próprios estão sob a mesma restrição.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_custom_fields_organizacao_chave_nativa"
	ON "ampmais_custom_fields" ("organizacao_id", "chave_nativa")
	WHERE "chave_nativa" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ampmais_client_custom_field_values" (
	"id" varchar(255) PRIMARY KEY,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE CASCADE,
	"cliente_id" varchar(255) NOT NULL REFERENCES "ampmais_clients"("id") ON DELETE CASCADE,
	"campo_id" varchar(255) NOT NULL REFERENCES "ampmais_custom_fields"("id") ON DELETE CASCADE,
	-- string | string[] | number, conforme o `tipo` da definição.
	"valor" jsonb NOT NULL,
	"data_insercao" timestamp NOT NULL DEFAULT now(),
	"data_atualizacao" timestamp
);

-- Chave natural: um cliente tem no máximo um valor por campo. É o alvo do upsert.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_client_custom_field_values_cliente_campo"
	ON "ampmais_client_custom_field_values" ("cliente_id", "campo_id");

-- Segmentação: "clientes da organização cujo campo X vale Y" varre por (organização, campo).
CREATE INDEX IF NOT EXISTS "idx_client_custom_field_values_organizacao_campo"
	ON "ampmais_client_custom_field_values" ("organizacao_id", "campo_id");
