CREATE TYPE "public"."message_template_status" AS ENUM('RASCUNHO', 'ATIVO', 'ARQUIVADO');
CREATE TYPE "public"."message_template_category" AS ENUM('AUTENTICAÇÃO', 'MARKETING', 'UTILIDADE');

CREATE TABLE "ampmais_message_templates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"nome" text NOT NULL,
	"status" "message_template_status" DEFAULT 'RASCUNHO' NOT NULL,
	"alerta" text,
	"metadados" jsonb DEFAULT '{"porNumeroTelefone":{}}'::jsonb NOT NULL,
	"conteudo" jsonb NOT NULL,
	"linguagem" varchar(16) DEFAULT 'pt_BR' NOT NULL,
	"categoria" "message_template_category" NOT NULL,
	"autor_id" varchar(255) NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "ampmais_message_templates"
	ADD CONSTRAINT "ampmais_message_templates_organizacao_id_ampmais_organizations_id_fk"
	FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "ampmais_message_templates"
	ADD CONSTRAINT "ampmais_message_templates_autor_id_ampmais_users_id_fk"
	FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "message_templates_organizacao_nome_idx"
	ON "ampmais_message_templates" USING btree ("organizacao_id", "nome");

CREATE INDEX "message_templates_organizacao_status_idx"
	ON "ampmais_message_templates" USING btree ("organizacao_id", "status");
