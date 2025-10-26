ALTER TABLE "ampmais_clients" ALTER COLUMN "telefone" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "ampmais_clients" ALTER COLUMN "telefone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "cpf_cnpj" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "telefone_base" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_cep" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_estado" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_cidade" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_bairro" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_logradouro" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_numero" text;--> statement-breakpoint
ALTER TABLE "ampmais_clients" ADD COLUMN "localizacao_complemento" text;