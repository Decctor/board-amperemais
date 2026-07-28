-- Fase 1 do redesign de campanhas/interações (docs/dev-planning/campaigns-interactions-redesign-plan.md):
-- ledger O(1) de quota semanal de envios, substituindo COUNT(*) + locks de linha de organizations/campaigns
-- na reserva de quota. campanha_id NULL = contador agregado da organização.
--
-- Este arquivo é DOCUMENTAÇÃO do schema aplicado via `npm run db:push` (convenção do repo);
-- não é executado pelo pipeline de migrations.
--
-- Requer PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT).
--
-- ⚠️  ESTE ARQUIVO É A FONTE DA VERDADE DO `NULLS NOT DISTINCT`. O schema Drizzle
-- (services/drizzle/schema/campaigns.ts) declara a constraint SEM o flag, porque a introspecção
-- do drizzle-kit 0.31.x hardcoda nullsNotDistinct=false e o flag declarado gera drift permanente
-- que aborta todo `db:push`. Consequência: em banco novo provisionado só por push, a constraint
-- nasce como UNIQUE comum e os contadores agregados (campanha_id NULL) deixam de ser
-- deduplicados — rode o ALTER abaixo à mão nesse cenário.
--
--   ALTER TABLE "ampmais_weekly_send_counters"
--     DROP CONSTRAINT "uq_weekly_send_counters_org_campanha_semana",
--     ADD CONSTRAINT "uq_weekly_send_counters_org_campanha_semana"
--       UNIQUE NULLS NOT DISTINCT ("organizacao_id", "campanha_id", "semana_chave");

CREATE TABLE "ampmais_weekly_send_counters" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"campanha_id" varchar(255),
	"semana_chave" varchar(10) NOT NULL,
	"usados" integer DEFAULT 0 NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_weekly_send_counters_org_campanha_semana" UNIQUE NULLS NOT DISTINCT ("organizacao_id", "campanha_id", "semana_chave")
);

ALTER TABLE "ampmais_weekly_send_counters"
	ADD CONSTRAINT "ampmais_weekly_send_counters_organizacao_id_ampmais_organizations_id_fk"
	FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade;

ALTER TABLE "ampmais_weekly_send_counters"
	ADD CONSTRAINT "ampmais_weekly_send_counters_campanha_id_ampmais_campaigns_id_fk"
	FOREIGN KEY ("campanha_id") REFERENCES "ampmais_campaigns"("id") ON DELETE cascade;

-- Backfill: não há script de backfill — a primeira reserva de cada contador na semana de cutover
-- inicializa `usados` a partir do COUNT(*) das interações que consomem quota naquela semana
-- (inicialização preguiçosa em lib/interactions/weekly-send-counters.ts, executada uma única vez
-- por contador graças ao guard NOT EXISTS + ON CONFLICT DO NOTHING).
