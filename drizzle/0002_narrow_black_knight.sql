CREATE TABLE "ampmais_auth_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"usuario_id" varchar(255) NOT NULL,
	"usuario_agente" text,
	"usuario_dispositivo" text,
	"usuario_navegador" text,
	"usuario_endereco_ip" text,
	"data_expiracao" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampmais_users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text NOT NULL,
	"avatar_url" text,
	"usuario" text NOT NULL,
	"senha" text NOT NULL,
	"permissoes" jsonb NOT NULL,
	"vendedor_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_auth_sessions" ADD CONSTRAINT "ampmais_auth_sessions_usuario_id_ampmais_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_users" ADD CONSTRAINT "ampmais_users_vendedor_id_ampmais_sellers_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."ampmais_sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_clients" DROP COLUMN "cpf_cnpj";