-- Tabs — Fase 3: solicitacoes publicas de pedido via QR (docs/tabs/implementation-plan.md)
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0046_tab_order_requests.sql

CREATE TABLE "ampmais_tab_order_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"service_point_id" varchar(255),
	"tab_id" varchar(255),
	"tab_order_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"payload_solicitacao" jsonb NOT NULL,
	"status" varchar(30) DEFAULT 'PENDENTE' NOT NULL,
	"operador_aprovador_id" varchar(255),
	"motivo_rejeicao" text,
	"erro_processamento" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp,
	CONSTRAINT "ampmais_tab_order_requests_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_tab_order_requests_service_point_id_fk" FOREIGN KEY ("service_point_id") REFERENCES "ampmais_service_points"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tab_order_requests_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "ampmais_tabs"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tab_order_requests_tab_order_id_fk" FOREIGN KEY ("tab_order_id") REFERENCES "ampmais_tab_orders"("id") ON DELETE set null,
	CONSTRAINT "ampmais_tab_order_requests_operador_aprovador_id_fk" FOREIGN KEY ("operador_aprovador_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);
CREATE UNIQUE INDEX "idx_tab_order_requests_org_idempotency_unique" ON "ampmais_tab_order_requests" ("organizacao_id", "idempotency_key");
CREATE INDEX "idx_tab_order_requests_org_status" ON "ampmais_tab_order_requests" ("organizacao_id", "status");
CREATE INDEX "idx_tab_order_requests_tab" ON "ampmais_tab_order_requests" ("tab_id");
CREATE INDEX "idx_tab_order_requests_service_point" ON "ampmais_tab_order_requests" ("service_point_id");
