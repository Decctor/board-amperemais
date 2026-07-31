-- Business-scoped user ID (BSUID) da Meta no cliente.
-- A partir do rollout de usernames, `from`/`wa_id` podem ser omitidos dos webhooks — o
-- BSUID é a única chave de identidade garantida. Escopo por portfólio de negócios;
-- regenera se o usuário trocar de número.

ALTER TABLE "ampmais_clients" ADD COLUMN "whatsapp_user_id" varchar(255);

CREATE UNIQUE INDEX "idx_clients_org_whatsapp_user_id"
	ON "ampmais_clients" ("organizacao_id", "whatsapp_user_id")
	WHERE "whatsapp_user_id" IS NOT NULL;
