CREATE TABLE "ampmais_partners" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identificador" text NOT NULL,
	"nome" text NOT NULL,
	"avatar_url" text,
	"cpf_cnpj" text,
	"telefone" text,
	"telefone_base" text,
	"email" text,
	"localizacao_cep" text,
	"localizacao_estado" text,
	"localizacao_cidade" text,
	"localizacao_bairro" text,
	"localizacao_logradouro" text,
	"localizacao_numero" text,
	"localizacao_complemento" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD COLUMN "parceiro_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_parceiro_id_ampmais_partners_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."ampmais_partners"("id") ON DELETE no action ON UPDATE no action;