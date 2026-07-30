-- Operações mutáveis e idempotentes iniciadas por agentes de IA.
-- Uma operação representa o efeito lógico; ai_agent_tool_calls continua registrando cada tentativa.

CREATE TABLE "ampmais_ai_agent_operations" (
	"id" varchar(255) PRIMARY KEY,
	"organizacao_id" varchar(255) NOT NULL,
	"agente_id" varchar(255) NOT NULL,
	"run_id" varchar(255),
	"tipo" varchar(64) NOT NULL,
	"chave" varchar(255) NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL DEFAULT 'PROCESSANDO',
	"input" jsonb,
	"output" jsonb,
	"recurso_tipo" varchar(64),
	"recurso_id" varchar(255),
	"erro" text,
	"lease_ate" timestamp NOT NULL,
	"data_inicio" timestamp NOT NULL DEFAULT now(),
	"data_fim" timestamp,
	"data_insercao" timestamp NOT NULL DEFAULT now(),
	"data_atualizacao" timestamp,
	CONSTRAINT "ampmais_ai_agent_operations_organizacao_id_ampmais_organizations_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE CASCADE,
	CONSTRAINT "ampmais_ai_agent_operations_agente_id_ampmais_ai_agents_id_fk"
		FOREIGN KEY ("agente_id") REFERENCES "public"."ampmais_ai_agents"("id") ON DELETE CASCADE,
	CONSTRAINT "ampmais_ai_agent_operations_run_id_ampmais_ai_agent_runs_id_fk"
		FOREIGN KEY ("run_id") REFERENCES "public"."ampmais_ai_agent_runs"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "ai_agent_operations_org_tipo_chave_idx"
	ON "ampmais_ai_agent_operations" ("organizacao_id", "tipo", "chave");
CREATE INDEX "ai_agent_operations_agent_status_idx"
	ON "ampmais_ai_agent_operations" ("agente_id", "status");
CREATE INDEX "ai_agent_operations_resource_idx"
	ON "ampmais_ai_agent_operations" ("recurso_tipo", "recurso_id");

ALTER TABLE "ampmais_ai_agent_tool_calls"
	ADD COLUMN "operacao_id" varchar(255);
ALTER TABLE "ampmais_ai_agent_tool_calls"
	ADD CONSTRAINT "ampmais_ai_agent_tool_calls_operacao_id_ampmais_ai_agent_operations_id_fk"
	FOREIGN KEY ("operacao_id") REFERENCES "public"."ampmais_ai_agent_operations"("id") ON DELETE SET NULL;
