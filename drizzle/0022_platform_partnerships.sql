CREATE TYPE "platform_partner_status" AS ENUM ('PENDENTE_APROVACAO', 'ATIVO', 'SUSPENSO', 'REJEITADO');
CREATE TYPE "platform_partner_referral_status" AS ENUM ('CAPTURADO', 'ORGANIZACAO_CRIADA', 'PAGAMENTO_CONFIRMADO', 'CANCELADO');
CREATE TYPE "platform_partner_commission_status" AS ENUM ('PENDENTE', 'APROVADA', 'CANCELADA', 'PAGA');
CREATE TYPE "platform_partner_payout_status" AS ENUM ('RASCUNHO', 'APROVADO', 'PAGO', 'CANCELADO');

ALTER TABLE "ampmais_auth_magic_links" ADD COLUMN "redirect_to" text;

CREATE TABLE "ampmais_platform_partners" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"usuario_id" varchar(255),
	"status" "platform_partner_status" DEFAULT 'PENDENTE_APROVACAO' NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text NOT NULL,
	"cpf_cnpj" text NOT NULL,
	"chave_pix" text NOT NULL,
	"arquivos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aceite_termos" boolean DEFAULT false NOT NULL,
	"data_aceite_termos" timestamp,
	"observacoes_internas" text,
	"data_aprovacao" timestamp,
	"aprovado_por_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp,
	CONSTRAINT "ampmais_platform_partners_usuario_id_ampmais_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_platform_partners_aprovado_por_id_ampmais_users_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE TABLE "ampmais_platform_partner_referral_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"partner_id" varchar(255) NOT NULL,
	"codigo_usado" text NOT NULL,
	"origem_url" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"ip_hash" text,
	"user_agent_hash" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_platform_partner_referral_events_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "ampmais_platform_partners"("id") ON DELETE cascade
);

CREATE TABLE "ampmais_platform_partner_referrals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"partner_id" varchar(255) NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"usuario_id" varchar(255),
	"codigo_usado" text NOT NULL,
	"origem" text NOT NULL,
	"status" "platform_partner_referral_status" DEFAULT 'ORGANIZACAO_CRIADA' NOT NULL,
	"data_captura" timestamp,
	"data_onboarding" timestamp DEFAULT now() NOT NULL,
	"data_primeiro_pagamento" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_platform_partner_referrals_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "ampmais_platform_partners"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_referrals_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_referrals_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE TABLE "ampmais_platform_partner_payouts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"partner_id" varchar(255) NOT NULL,
	"status" "platform_partner_payout_status" DEFAULT 'RASCUNHO' NOT NULL,
	"competencia_inicio" timestamp NOT NULL,
	"competencia_fim" timestamp NOT NULL,
	"valor_total_centavos" integer DEFAULT 0 NOT NULL,
	"metodo" text,
	"chave_pix_snapshot" text,
	"comprovante_url" text,
	"data_prevista" timestamp,
	"data_pagamento" timestamp,
	"observacoes" text,
	"autor_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp,
	CONSTRAINT "ampmais_platform_partner_payouts_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "ampmais_platform_partners"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_payouts_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE TABLE "ampmais_platform_partner_commissions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"partner_id" varchar(255) NOT NULL,
	"referral_id" varchar(255) NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"payout_id" varchar(255),
	"stripe_invoice_id" text,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"numero_invoice_assinatura" integer NOT NULL,
	"valor_invoice_bruto_centavos" integer NOT NULL,
	"valor_consultoria_centavos" integer DEFAULT 0 NOT NULL,
	"valor_base_comissionavel_centavos" integer NOT NULL,
	"percentual_comissao_bps" integer NOT NULL,
	"valor_comissao_centavos" integer NOT NULL,
	"regra_versao" text NOT NULL,
	"regra_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invoice_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ajuste_origem_commission_id" varchar(255),
	"ajuste_motivo" text,
	"status" "platform_partner_commission_status" DEFAULT 'PENDENTE' NOT NULL,
	"data_elegibilidade" timestamp NOT NULL,
	"data_aprovacao" timestamp,
	"aprovado_por_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_platform_partner_commissions_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "ampmais_platform_partners"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_commissions_referral_id_fk" FOREIGN KEY ("referral_id") REFERENCES "ampmais_platform_partner_referrals"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_commissions_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_platform_partner_commissions_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "ampmais_platform_partner_payouts"("id") ON DELETE set null,
	CONSTRAINT "ampmais_platform_partner_commissions_ajuste_origem_fk" FOREIGN KEY ("ajuste_origem_commission_id") REFERENCES "ampmais_platform_partner_commissions"("id") ON DELETE set null,
	CONSTRAINT "ampmais_platform_partner_commissions_aprovado_por_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE UNIQUE INDEX "uniq_platform_partners_codigo" ON "ampmais_platform_partners" ("codigo");
CREATE INDEX "idx_platform_partners_usuario_id" ON "ampmais_platform_partners" ("usuario_id");
CREATE INDEX "idx_platform_partners_status" ON "ampmais_platform_partners" ("status");
CREATE INDEX "idx_platform_partners_email" ON "ampmais_platform_partners" ("email");
CREATE INDEX "idx_platform_partners_cpf_cnpj" ON "ampmais_platform_partners" ("cpf_cnpj");

CREATE INDEX "idx_platform_partner_referral_events_partner_id" ON "ampmais_platform_partner_referral_events" ("partner_id");
CREATE INDEX "idx_platform_partner_referral_events_codigo_usado" ON "ampmais_platform_partner_referral_events" ("codigo_usado");
CREATE INDEX "idx_platform_partner_referral_events_data_insercao" ON "ampmais_platform_partner_referral_events" ("data_insercao");

CREATE INDEX "idx_platform_partner_referrals_partner_id" ON "ampmais_platform_partner_referrals" ("partner_id");
CREATE UNIQUE INDEX "uniq_platform_partner_referrals_organizacao_id" ON "ampmais_platform_partner_referrals" ("organizacao_id");
CREATE INDEX "idx_platform_partner_referrals_usuario_id" ON "ampmais_platform_partner_referrals" ("usuario_id");
CREATE INDEX "idx_platform_partner_referrals_status" ON "ampmais_platform_partner_referrals" ("status");

CREATE INDEX "idx_platform_partner_payouts_partner_id" ON "ampmais_platform_partner_payouts" ("partner_id");
CREATE INDEX "idx_platform_partner_payouts_status" ON "ampmais_platform_partner_payouts" ("status");
CREATE INDEX "idx_platform_partner_payouts_competencia" ON "ampmais_platform_partner_payouts" ("competencia_inicio", "competencia_fim");

CREATE INDEX "idx_platform_partner_commissions_partner_id" ON "ampmais_platform_partner_commissions" ("partner_id");
CREATE INDEX "idx_platform_partner_commissions_referral_id" ON "ampmais_platform_partner_commissions" ("referral_id");
CREATE INDEX "idx_platform_partner_commissions_organizacao_id" ON "ampmais_platform_partner_commissions" ("organizacao_id");
CREATE INDEX "idx_platform_partner_commissions_payout_id" ON "ampmais_platform_partner_commissions" ("payout_id");
CREATE UNIQUE INDEX "uniq_platform_partner_commissions_stripe_invoice_id" ON "ampmais_platform_partner_commissions" ("stripe_invoice_id");
CREATE INDEX "idx_platform_partner_commissions_status" ON "ampmais_platform_partner_commissions" ("status");
CREATE INDEX "idx_platform_partner_commissions_data_elegibilidade" ON "ampmais_platform_partner_commissions" ("data_elegibilidade");
