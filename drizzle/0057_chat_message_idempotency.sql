-- Idempotência de mensagens de chat por wamid.
-- Webhooks da Meta são at-least-once: cada reentrega inseria uma nova linha em
-- ampmais_chat_messages. A chave natural (whatsapp_message_id, organizacao_id) vira
-- constraint — o mesmo par que o history-sync já usava como chave de dedupe via
-- find-then-insert, agora à prova de corrida.

-- 1) Reaponta a denormalização dos chats que apontam para uma duplicata que será removida.
WITH ranqueadas AS (
	SELECT id,
		first_value(id) OVER (
			PARTITION BY organizacao_id, whatsapp_message_id
			ORDER BY data_envio ASC, id ASC
		) AS manter_id
	FROM ampmais_chat_messages
	WHERE whatsapp_message_id IS NOT NULL
)
UPDATE ampmais_chats c
SET ultima_mensagem_id = r.manter_id
FROM ranqueadas r
WHERE c.ultima_mensagem_id = r.id AND r.id <> r.manter_id;

-- 2) Remove as duplicatas, preservando a linha mais antiga de cada grupo.
WITH ranqueadas AS (
	SELECT id,
		first_value(id) OVER (
			PARTITION BY organizacao_id, whatsapp_message_id
			ORDER BY data_envio ASC, id ASC
		) AS manter_id
	FROM ampmais_chat_messages
	WHERE whatsapp_message_id IS NOT NULL
)
DELETE FROM ampmais_chat_messages m
USING ranqueadas r
WHERE m.id = r.id AND r.id <> r.manter_id;

-- 3) Troca o índice de lookup pelo índice único. wamid na frente: o índice segue servindo
-- os lookups por wamid puro de applyProviderDeliveryStatus.
DROP INDEX IF EXISTS "idx_chat_messages_whatsapp_message_id";
CREATE UNIQUE INDEX "idx_chat_messages_whatsapp_message_id_org"
	ON "ampmais_chat_messages" ("whatsapp_message_id", "organizacao_id")
	WHERE "whatsapp_message_id" IS NOT NULL;
