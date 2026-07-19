-- Conciliação bancária (docs/bank-reconciliation-design.md).
-- Aplicada manualmente (fora do db:push) porque o push está bloqueado por drift pré-existente
-- do banco (tabelas ampmais_access_* fora do schema + constraint pendente de weekly_send_counters).
-- Somente mudanças aditivas.

CREATE TYPE "public"."financial_statement_origin" AS ENUM ('ARQUIVO', 'OPEN_FINANCE');
CREATE TYPE "public"."financial_statement_import_status" AS ENUM ('PROCESSANDO', 'PROCESSADO', 'ERRO');
CREATE TYPE "public"."financial_statement_transaction_status" AS ENUM ('PENDENTE', 'CONCILIADA', 'IGNORADA');
CREATE TYPE "public"."financial_reconciliation_match_type" AS ENUM ('AUTOMATICO', 'HEURISTICO', 'IA', 'MANUAL');
CREATE TYPE "public"."financial_reconciliation_match_status" AS ENUM ('SUGERIDO', 'CONFIRMADO', 'REJEITADO');
CREATE TYPE "public"."financial_reconciliation_action" AS ENUM ('VINCULADO', 'EFETIVADO', 'LANCAMENTO_CRIADO');
CREATE TYPE "public"."financial_openfinance_connection_status" AS ENUM ('CONECTADO', 'EXPIRADO', 'ERRO', 'DESATIVADO');

ALTER TYPE "public"."accounting_entry_origin_type" ADD VALUE IF NOT EXISTS 'CONCILIACAO';

CREATE TABLE "ampmais_financial_openfinance_connections" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	"conta_financeira_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_accounts"("id") ON DELETE cascade,
	"provedor" varchar(50) NOT NULL,
	"status" "financial_openfinance_connection_status" DEFAULT 'CONECTADO' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"provedor_item_id" varchar(255),
	"provedor_conta_id" varchar(255),
	"provedor_metadados" jsonb,
	"erro" text,
	"ultima_sincronizacao" timestamp,
	"autor_id" varchar(255) REFERENCES "ampmais_users"("id"),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp
);
CREATE INDEX "idx_financial_of_connections_organizacao_id" ON "ampmais_financial_openfinance_connections" ("organizacao_id");
CREATE INDEX "idx_financial_of_connections_conta" ON "ampmais_financial_openfinance_connections" ("conta_financeira_id");
CREATE UNIQUE INDEX "uq_financial_of_connections_provedor_conta" ON "ampmais_financial_openfinance_connections" ("organizacao_id", "provedor", "provedor_conta_id");

CREATE TABLE "ampmais_financial_statement_imports" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	"conta_financeira_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_accounts"("id") ON DELETE cascade,
	"origem" "financial_statement_origin" DEFAULT 'ARQUIVO' NOT NULL,
	"conexao_id" varchar(255) REFERENCES "ampmais_financial_openfinance_connections"("id") ON DELETE set null,
	"status" "financial_statement_import_status" DEFAULT 'PROCESSANDO' NOT NULL,
	"erro" text,
	"arquivo_nome" varchar(500),
	"arquivo_storage_path" text,
	"arquivo_mime_type" varchar(100),
	"arquivo_tamanho_bytes" integer,
	"periodo_inicio" timestamp,
	"periodo_fim" timestamp,
	"saldo_inicial" double precision,
	"saldo_final" double precision,
	"autor_id" varchar(255) REFERENCES "ampmais_users"("id"),
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "idx_financial_statement_imports_organizacao_id" ON "ampmais_financial_statement_imports" ("organizacao_id");
CREATE INDEX "idx_financial_statement_imports_conta" ON "ampmais_financial_statement_imports" ("conta_financeira_id");
CREATE INDEX "idx_financial_statement_imports_status" ON "ampmais_financial_statement_imports" ("status");

CREATE TABLE "ampmais_financial_statement_transactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	"importacao_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_statement_imports"("id") ON DELETE cascade,
	"conta_financeira_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_accounts"("id") ON DELETE cascade,
	"data_transacao" timestamp NOT NULL,
	"descricao" text NOT NULL,
	"tipo" "financial_transaction_type" NOT NULL,
	"valor" double precision NOT NULL,
	"metodo" "payment_method",
	"id_externo" varchar(255),
	"hash" varchar(64) NOT NULL,
	"status" "financial_statement_transaction_status" DEFAULT 'PENDENTE' NOT NULL,
	"metadados" jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "idx_financial_statement_transactions_organizacao_id" ON "ampmais_financial_statement_transactions" ("organizacao_id");
CREATE INDEX "idx_financial_statement_transactions_importacao" ON "ampmais_financial_statement_transactions" ("importacao_id");
CREATE INDEX "idx_financial_statement_transactions_conta_status" ON "ampmais_financial_statement_transactions" ("conta_financeira_id", "status");
CREATE INDEX "idx_financial_statement_transactions_data" ON "ampmais_financial_statement_transactions" ("data_transacao");
CREATE UNIQUE INDEX "uq_financial_statement_transactions_id_externo" ON "ampmais_financial_statement_transactions" ("conta_financeira_id", "id_externo");
CREATE UNIQUE INDEX "uq_financial_statement_transactions_hash" ON "ampmais_financial_statement_transactions" ("conta_financeira_id", "hash");

CREATE TABLE "ampmais_financial_reconciliation_matches" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	"extrato_transacao_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_statement_transactions"("id") ON DELETE cascade,
	"transacao_financeira_id" varchar(255) NOT NULL REFERENCES "ampmais_financial_transactions"("id") ON DELETE cascade,
	"tipo" "financial_reconciliation_match_type" NOT NULL,
	"confianca" double precision,
	"status" "financial_reconciliation_match_status" DEFAULT 'SUGERIDO' NOT NULL,
	"acao" "financial_reconciliation_action",
	"autor_id" varchar(255) REFERENCES "ampmais_users"("id"),
	"data_insercao" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "idx_financial_reconciliation_matches_organizacao_id" ON "ampmais_financial_reconciliation_matches" ("organizacao_id");
CREATE INDEX "idx_financial_reconciliation_matches_extrato" ON "ampmais_financial_reconciliation_matches" ("extrato_transacao_id");
CREATE INDEX "idx_financial_reconciliation_matches_transacao" ON "ampmais_financial_reconciliation_matches" ("transacao_financeira_id");
CREATE INDEX "idx_financial_reconciliation_matches_status" ON "ampmais_financial_reconciliation_matches" ("status");
CREATE UNIQUE INDEX "uq_financial_reconciliation_matches_par" ON "ampmais_financial_reconciliation_matches" ("extrato_transacao_id", "transacao_financeira_id");

CREATE TABLE "ampmais_financial_reconciliation_rules" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	"padrao_descricao" varchar(500) NOT NULL,
	"tipo" "financial_transaction_type" NOT NULL,
	"conta_contabil_debito_id" varchar(255) NOT NULL REFERENCES "ampmais_accounts_charts"("id") ON DELETE cascade,
	"conta_contabil_credito_id" varchar(255) NOT NULL REFERENCES "ampmais_accounts_charts"("id") ON DELETE cascade,
	"metodo" "payment_method",
	"usos" integer DEFAULT 1 NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp
);
CREATE INDEX "idx_financial_reconciliation_rules_organizacao_id" ON "ampmais_financial_reconciliation_rules" ("organizacao_id");
CREATE UNIQUE INDEX "uq_financial_reconciliation_rules_padrao" ON "ampmais_financial_reconciliation_rules" ("organizacao_id", "padrao_descricao", "tipo");
