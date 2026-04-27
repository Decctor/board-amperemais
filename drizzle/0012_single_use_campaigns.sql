ALTER TYPE "public"."campaign_trigger_type" ADD VALUE IF NOT EXISTS 'USO-UNICO';--> statement-breakpoint

ALTER TABLE "ampmais_campaigns"
ADD COLUMN IF NOT EXISTS "gatilho_uso_unico_data_referencia" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_campaigns_single_use_processing"
ON "ampmais_campaigns" USING btree (
	"organizacao_id",
	"gatilho_tipo",
	"ativo",
	"gatilho_uso_unico_data_referencia",
	"execucao_agendada_bloco"
)
WHERE "gatilho_tipo"::text = 'USO-UNICO';
