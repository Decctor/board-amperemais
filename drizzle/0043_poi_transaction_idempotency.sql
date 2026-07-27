-- Idempotência de new-transaction do POI (plano §11): chave gerada no dispositivo antes da
-- primeira tentativa; repetição devolve a resposta original. Unicidade por constraint de banco,
-- hash do payload para rejeitar reuso com payload divergente, status para concorrência.
CREATE TABLE "ampmais_poi_transaction_idempotency_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"principal_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"payload_hash" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'PROCESSANDO' NOT NULL,
	"tentativa_id" varchar(255) NOT NULL,
	"lease_expira_em" timestamp NOT NULL,
	"numero_tentativas" integer DEFAULT 1 NOT NULL,
	"resposta" jsonb,
	"erro" text,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp
);--> statement-breakpoint
ALTER TABLE "ampmais_poi_transaction_idempotency_requests" ADD CONSTRAINT "ampmais_poi_transaction_idempotency_requests_organizacao_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_poi_transaction_idempotency_org_key_unique" ON "ampmais_poi_transaction_idempotency_requests" ("organizacao_id", "idempotency_key");
