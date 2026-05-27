CREATE INDEX "idx_interactions_pending_processing"
ON "ampmais_interactions" USING btree (
	"organizacao_id",
	"agendamento_data_referencia",
	"agendamento_bloco_referencia",
	"data_execucao",
	"data_insercao",
	"id"
);

CREATE INDEX "idx_interactions_org_weekly_quota"
ON "ampmais_interactions" USING btree (
	"organizacao_id",
	"tipo",
	"data_execucao"
);

CREATE INDEX "idx_interactions_campaign_weekly_quota"
ON "ampmais_interactions" USING btree (
	"organizacao_id",
	"campanha_id",
	"tipo",
	"data_execucao"
);
