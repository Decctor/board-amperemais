-- Deals personalizados (vendas B2B multi-licença): uma assinatura Stripe cobre N organizações.
-- Aplicável via `npm run db:push` (fluxo padrão do projeto) — este arquivo documenta o DDL.
CREATE TYPE "public"."deal_status" AS ENUM('PENDENTE', 'ATIVO', 'INADIMPLENTE', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."deal_intervalo" AS ENUM('MENSAL', 'ANUAL');--> statement-breakpoint
CREATE TABLE "ampmais_deals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"usuario_obtentor_id" varchar(255),
	"nome_obtentor" text NOT NULL,
	"email_obtentor" text NOT NULL,
	"telefone_obtentor" text,
	"plano_base" text NOT NULL,
	"quantidade_licencas" integer NOT NULL,
	"valor_unitario_centavos" integer NOT NULL,
	"intervalo" "deal_intervalo" DEFAULT 'MENSAL' NOT NULL,
	"status" "deal_status" DEFAULT 'PENDENTE' NOT NULL,
	"stripe_price_id" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_checkout_session_id" text,
	"stripe_subscription_status" text,
	"stripe_subscription_status_ultima_alteracao" timestamp,
	"autor_id" varchar(255) NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ampmais_deals" ADD CONSTRAINT "ampmais_deals_usuario_obtentor_id_ampmais_users_id_fk" FOREIGN KEY ("usuario_obtentor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_deals" ADD CONSTRAINT "ampmais_deals_autor_id_ampmais_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deals_usuario_obtentor_id" ON "ampmais_deals" ("usuario_obtentor_id");--> statement-breakpoint
CREATE INDEX "idx_deals_email_obtentor" ON "ampmais_deals" ("email_obtentor");--> statement-breakpoint
CREATE INDEX "idx_deals_stripe_customer_id" ON "ampmais_deals" ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_deals_status" ON "ampmais_deals" ("status");--> statement-breakpoint
ALTER TABLE "ampmais_organizations" ADD COLUMN "deal_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ampmais_organizations" ADD CONSTRAINT "ampmais_organizations_deal_id_ampmais_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."ampmais_deals"("id") ON DELETE set null ON UPDATE no action;
