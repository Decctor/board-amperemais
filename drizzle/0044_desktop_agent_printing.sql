-- Impressão via agente desktop local (docs/dev-planning/desktop-agent-printing-plan.md):
-- impressoras sincronizadas pelo agent (roteamento por finalidade) e fila durável de jobs
-- com lease de claim, TTL por finalidade e idempotência de auto-print por (org, chave).
-- finalidade/formato/driver/status são varchar de propósito (novos valores sem migração de enum).
CREATE TABLE "ampmais_agent_printers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"principal_id" varchar(255) NOT NULL,
	"nome_sistema" varchar(255) NOT NULL,
	"apelido" text,
	"driver" varchar(30) DEFAULT 'DRIVER_SO' NOT NULL,
	"finalidades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"disponivel" boolean DEFAULT true NOT NULL,
	"metadados" jsonb,
	"ultima_sincronizacao" timestamp,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ampmais_print_jobs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"loja_id" varchar(255),
	"finalidade" varchar(30) NOT NULL,
	"formato" varchar(30) NOT NULL,
	"conteudo" text,
	"conteudo_url" text,
	"copias" integer DEFAULT 1 NOT NULL,
	"dados" jsonb,
	"origem_tipo" varchar(30) NOT NULL,
	"origem_id" varchar(255),
	"chave_idempotencia" varchar(255),
	"status" varchar(30) DEFAULT 'PENDENTE' NOT NULL,
	"tentativa_id" varchar(255),
	"lease_expira_em" timestamp,
	"numero_tentativas" integer DEFAULT 0 NOT NULL,
	"impressora_id" varchar(255),
	"principal_id" varchar(255),
	"erro" text,
	"expira_em" timestamp NOT NULL,
	"solicitado_por_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	"data_conclusao" timestamp
);--> statement-breakpoint
ALTER TABLE "ampmais_agent_printers" ADD CONSTRAINT "ampmais_agent_printers_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_agent_printers" ADD CONSTRAINT "ampmais_agent_printers_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_print_jobs" ADD CONSTRAINT "ampmais_print_jobs_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_print_jobs" ADD CONSTRAINT "ampmais_print_jobs_impressora_id_fk" FOREIGN KEY ("impressora_id") REFERENCES "public"."ampmais_agent_printers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_print_jobs" ADD CONSTRAINT "ampmais_print_jobs_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_print_jobs" ADD CONSTRAINT "ampmais_print_jobs_solicitado_por_id_fk" FOREIGN KEY ("solicitado_por_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_printers_principal_nome_sistema" ON "ampmais_agent_printers" ("principal_id", "nome_sistema");--> statement-breakpoint
CREATE INDEX "idx_agent_printers_organizacao_id" ON "ampmais_agent_printers" ("organizacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_print_jobs_org_chave_idempotencia" ON "ampmais_print_jobs" ("organizacao_id", "chave_idempotencia");--> statement-breakpoint
CREATE INDEX "idx_print_jobs_organizacao_status_data" ON "ampmais_print_jobs" ("organizacao_id", "status", "data_insercao");
