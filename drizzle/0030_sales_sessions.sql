-- Sessões de venda (turno time-boxed sobre um responsável) e conferência de fechamento de caixa.
-- Aditivo: o acoplamento com vendas e movimentos financeiros é via FK nullable; o caminho null
-- é exatamente o fluxo atual (sem regressão).

-- 1. Enum de status da sessão.
CREATE TYPE "public"."sales_session_status" AS ENUM('ABERTA', 'FECHADA', 'CONFERIDA', 'CANCELADA');--> statement-breakpoint

-- 2. sales_sessions: o turno em si.
CREATE TABLE "ampmais_sales_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"conta_financeira_id" varchar(255),
	"responsavel_vendedor_id" varchar(255),
	"escopo_chave" text NOT NULL,
	"aberta_por_usuario_id" varchar(255),
	"fechada_por_usuario_id" varchar(255),
	"conferida_por_usuario_id" varchar(255),
	"status" "public"."sales_session_status" DEFAULT 'ABERTA' NOT NULL,
	"saldo_inicial" double precision DEFAULT 0 NOT NULL,
	"data_abertura" timestamp DEFAULT now() NOT NULL,
	"data_fechamento" timestamp,
	"total_esperado" double precision,
	"total_informado" double precision,
	"diferenca_total" double precision,
	"observacoes_abertura" text,
	"observacoes_fechamento" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 3. sales_session_reconciliations: conferência por método de pagamento (snapshot do fechamento).
CREATE TABLE "ampmais_sales_session_reconciliations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"sessao_venda_id" varchar(255) NOT NULL,
	"metodo" "public"."payment_method" NOT NULL,
	"valor_esperado" double precision NOT NULL,
	"valor_informado" double precision,
	"diferenca" double precision,
	"data_insercao" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- 4. FKs nullable de acoplamento nas tabelas existentes.
ALTER TABLE "ampmais_financial_transactions" ADD COLUMN "sessao_venda_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD COLUMN "sessao_venda_id" varchar(255);--> statement-breakpoint

-- 5. Foreign keys das novas tabelas.
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_conta_financeira_id_ampmais_financial_accounts_id_fk" FOREIGN KEY ("conta_financeira_id") REFERENCES "public"."ampmais_financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_responsavel_vendedor_id_ampmais_sellers_id_fk" FOREIGN KEY ("responsavel_vendedor_id") REFERENCES "public"."ampmais_sellers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_aberta_por_usuario_id_ampmais_users_id_fk" FOREIGN KEY ("aberta_por_usuario_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_fechada_por_usuario_id_ampmais_users_id_fk" FOREIGN KEY ("fechada_por_usuario_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_sessions" ADD CONSTRAINT "ampmais_sales_sessions_conferida_por_usuario_id_ampmais_users_id_fk" FOREIGN KEY ("conferida_por_usuario_id") REFERENCES "public"."ampmais_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_session_reconciliations" ADD CONSTRAINT "ampmais_sales_session_reconciliations_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales_session_reconciliations" ADD CONSTRAINT "ampmais_sales_session_reconciliations_sessao_venda_id_ampmais_sales_sessions_id_fk" FOREIGN KEY ("sessao_venda_id") REFERENCES "public"."ampmais_sales_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 6. Foreign keys das colunas de acoplamento (set null: a sessão é uma lente, nunca dono).
ALTER TABLE "ampmais_financial_transactions" ADD CONSTRAINT "ampmais_financial_transactions_sessao_venda_id_ampmais_sales_sessions_id_fk" FOREIGN KEY ("sessao_venda_id") REFERENCES "public"."ampmais_sales_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_sales" ADD CONSTRAINT "ampmais_sales_sessao_venda_id_ampmais_sales_sessions_id_fk" FOREIGN KEY ("sessao_venda_id") REFERENCES "public"."ampmais_sales_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 7. Índices.
CREATE INDEX "idx_sales_sessions_organizacao_id" ON "ampmais_sales_sessions" USING btree ("organizacao_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sessions_status" ON "ampmais_sales_sessions" USING btree ("organizacao_id","status");--> statement-breakpoint
CREATE INDEX "idx_sales_sessions_responsavel" ON "ampmais_sales_sessions" USING btree ("responsavel_vendedor_id");--> statement-breakpoint
CREATE INDEX "idx_sales_session_reconciliations_sessao" ON "ampmais_sales_session_reconciliations" USING btree ("sessao_venda_id");--> statement-breakpoint
CREATE INDEX "idx_financial_transactions_sessao" ON "ampmais_financial_transactions" USING btree ("sessao_venda_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sessao" ON "ampmais_sales" USING btree ("sessao_venda_id");--> statement-breakpoint

-- 8. Unicidade: no máximo uma sessão ABERTA por escopo (índice parcial — escopo dinâmico via coluna estática).
CREATE UNIQUE INDEX "uq_sales_sessions_aberta" ON "ampmais_sales_sessions" USING btree ("organizacao_id","escopo_chave") WHERE "status" = 'ABERTA';
