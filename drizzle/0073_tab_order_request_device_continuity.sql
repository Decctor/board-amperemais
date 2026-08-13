-- Tabs - Fase 4: continuidade publica por dispositivo.
-- DDL aditivo. APLICAR MANUALMENTE (nao aplicado pelo agente):
--   npx tsx ./scripts/apply-sql-migration.ts drizzle/0073_tab_order_request_device_continuity.sql

ALTER TABLE "ampmais_tab_order_requests"
	ADD COLUMN "device_key_hash" varchar(64);

CREATE INDEX "idx_tab_order_requests_service_point_device"
	ON "ampmais_tab_order_requests" ("service_point_id", "device_key_hash");
