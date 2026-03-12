CREATE TABLE "ampmais_message_template_groups" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"nome" text NOT NULL,
	"autor_id" varchar(255) NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampmais_message_template_versions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"grupo_id" varchar(255) NOT NULL,
	"versao" integer NOT NULL,
	"meta_nome" text NOT NULL,
	"categoria" "whatsapp_template_category" NOT NULL,
	"componentes" jsonb NOT NULL,
	"autor_id" varchar(255) NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampmais_message_template_version_phones" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"versao_id" varchar(255) NOT NULL,
	"telefone_id" varchar(255) NOT NULL,
	"whatsapp_template_id" varchar(255),
	"status" "whatsapp_template_status" DEFAULT 'PENDENTE' NOT NULL,
	"qualidade" "whatsapp_template_quality" DEFAULT 'PENDENTE' NOT NULL,
	"rejeicao" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_message_template_groups" ADD CONSTRAINT "ampmais_message_template_groups_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_message_template_groups" ADD CONSTRAINT "ampmais_message_template_groups_autor_id_ampmais_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_message_template_versions" ADD CONSTRAINT "ampmais_message_template_versions_grupo_id_ampmais_message_template_groups_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."ampmais_message_template_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_message_template_versions" ADD CONSTRAINT "ampmais_message_template_versions_autor_id_ampmais_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_message_template_version_phones" ADD CONSTRAINT "ampmais_message_template_version_phones_versao_id_ampmais_message_template_versions_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."ampmais_message_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_message_template_version_phones" ADD CONSTRAINT "ampmais_message_template_version_phones_telefone_id_ampmais_whatsapp_connection_phones_id_fk" FOREIGN KEY ("telefone_id") REFERENCES "public"."ampmais_whatsapp_connection_phones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "msg_tmpl_version_phones_whatsapp_template_id_idx" ON "ampmais_message_template_version_phones" USING btree ("whatsapp_template_id");
