-- Chat Attendance Redesign — limpeza do legado (docs/dev-planning/chat-attendance-redesign-plan.md §6.6)
--
-- ⚠️  APLICAR SOMENTE APOS O DEPLOY DO CODIGO NOVO ESTAR ESTAVEL EM PRODUCAO.
-- Sugestao: uma semana de operacao normal entre a 0052 e esta migration.
-- Nao ha rollback por migration depois deste ponto — a volta e restauracao de dump.

-- ─── 1. Re-executa os backfills para capturar escritas do periodo de transicao ──
-- Entre a 0052 e o deploy do codigo novo, o codigo antigo continuou escrevendo
-- chat_services, whatsapp_message_status e is_echo. Estes blocos sao os mesmos
-- da 0052 e sao idempotentes.

UPDATE "ampmais_chat_messages" m
SET "cliente_id" = c."cliente_id"
FROM "ampmais_chats" c
WHERE m."chat_id" = c."id" AND m."cliente_id" IS NULL;

UPDATE "ampmais_chat_messages"
SET "status_entrega" = CASE
	WHEN "status" = 'CANCELADO' THEN 'CANCELADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENVIADO'  THEN 'ENVIADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENTREGUE' THEN 'ENTREGUE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'LIDO'     THEN 'LIDA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'FALHOU'   THEN 'FALHA'::"chat_message_delivery_status"
	ELSE "status_entrega"
END
WHERE "status_entrega" = 'PENDENTE' AND "whatsapp_message_status" <> 'PENDENTE';

UPDATE "ampmais_chat_messages" SET "whatsapp_echo" = true WHERE "is_echo" = true AND "whatsapp_echo" = false;

INSERT INTO "ampmais_chat_assignments" (
	"id", "organizacao_id", "chat_id", "responsavel_tipo", "responsavel_usuario_id",
	"status", "resumo", "data_atribuicao", "data_encerramento", "data_ultima_entrada_cliente", "data_insercao"
)
SELECT
	gen_random_uuid()::text,
	sa."organizacao_id",
	sa."chat_id",
	CASE sa."responsavel_tipo"
		WHEN 'USUÁRIO'      THEN 'USUARIO'
		WHEN 'AI'           THEN 'AGENTE'
		WHEN 'BUSINESS-APP' THEN 'EXTERNO'
		ELSE 'NAO_ATRIBUIDO'
	END,
	CASE WHEN sa."responsavel_tipo" = 'USUÁRIO' THEN sa."responsavel_usuario_id" ELSE NULL END,
	CASE sa."status"
		WHEN 'PENDENTE'     THEN 'ABERTO'
		WHEN 'EM_ANDAMENTO' THEN 'EM_ATENDIMENTO'
		ELSE 'ENCERRADO'
	END,
	NULLIF(sa."descricao", 'NÃO ESPECIFICADO'),
	sa."data_inicio",
	sa."data_fim",
	c."ultima_mensagem_entrada_data",
	now()
FROM (
	SELECT DISTINCT ON (s."chat_id")
		s."organizacao_id", s."chat_id", s."responsavel_tipo",
		s."responsavel_usuario_id", s."descricao", s."status",
		s."data_inicio", s."data_fim"
	FROM "ampmais_chat_services" s
	WHERE s."status" IN ('PENDENTE', 'EM_ANDAMENTO')
	ORDER BY s."chat_id", s."data_inicio" DESC, s."id" DESC
) sa
JOIN "ampmais_chats" c ON c."id" = sa."chat_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "ampmais_chat_assignments" a
	WHERE a."chat_id" = sa."chat_id" AND a."status" NOT IN ('ENCERRADO', 'CANCELADO')
);

UPDATE "ampmais_chat_assignments"
SET "responsavel_tipo" = 'NAO_ATRIBUIDO'
WHERE "responsavel_tipo" = 'USUARIO' AND "responsavel_usuario_id" IS NULL;

INSERT INTO "ampmais_chat_assignments" (
	"id", "organizacao_id", "chat_id", "responsavel_tipo", "status",
	"data_atribuicao", "data_ultima_entrada_cliente", "data_insercao"
)
SELECT
	gen_random_uuid()::text, c."organizacao_id", c."id", 'NAO_ATRIBUIDO',
	CASE
		WHEN c."ultima_mensagem_entrada_data" IS NOT NULL
			AND (c."ultima_mensagem_saida_data" IS NULL OR c."ultima_mensagem_entrada_data" > c."ultima_mensagem_saida_data")
		THEN 'ABERTO'
		ELSE 'EM_ATENDIMENTO'
	END,
	COALESCE(c."ultima_mensagem_data", now()),
	c."ultima_mensagem_entrada_data",
	now()
FROM "ampmais_chats" c
WHERE NOT EXISTS (
	SELECT 1 FROM "ampmais_chat_assignments" a
	WHERE a."chat_id" = c."id" AND a."status" NOT IN ('ENCERRADO', 'CANCELADO')
);

-- ─── 2. Aperta o NOT NULL agora que o backfill esta completo ───────────────
ALTER TABLE "ampmais_chat_messages" ALTER COLUMN "cliente_id" SET NOT NULL;

-- ─── 3. Drops ──────────────────────────────────────────────────────────────
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "servico_id";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "whatsapp_message_status";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "status";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "is_echo";

ALTER TABLE "ampmais_chats" DROP COLUMN "status";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_mensagem_conteudo_tipo";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_mensagem_conteudo_texto";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_interacao_cliente_data";
ALTER TABLE "ampmais_chats" DROP COLUMN "ai_agendamento_resposta_data";

DROP TABLE "ampmais_chat_services";

-- Os DROP TYPE so passam depois que as colunas acima sumiram. Se algum falhar,
-- a transacao inteira reverte (desejavel): investigar com
--   SELECT * FROM pg_depend WHERE refobjid = '<tipo>'::regtype;
DROP TYPE "chat_service_status";
DROP TYPE "chat_service_responsible_type";
DROP TYPE "chat_status";
DROP TYPE "chat_message_status";
DROP TYPE "chat_message_whatsapp_status";
