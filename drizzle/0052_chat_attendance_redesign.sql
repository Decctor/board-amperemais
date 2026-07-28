-- Chat Attendance Redesign — Fase 1 (docs/dev-planning/chat-attendance-redesign-plan.md)
-- DDL ADITIVO. Seguro de aplicar com o codigo antigo em producao.
-- Aplicado via scripts/apply-sql-migration.ts (drizzle push/generate travam em prompts de drift).
--
-- ATENCAO: o script envolve o arquivo inteiro em uma transacao. Por isso nao ha
-- CREATE INDEX CONCURRENTLY aqui. Se o volume de ampmais_chat_messages tornar o lock
-- inaceitavel, mover os CREATE INDEX para um arquivo separado aplicado com psql -f.

-- ─── 1. Enum novo de status de entrega de mensagem ──────────────────────────
CREATE TYPE "chat_message_delivery_status" AS ENUM ('PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA', 'CANCELADA');

-- ─── 2. chat_assignments ────────────────────────────────────────────────────
CREATE TABLE "ampmais_chat_assignments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"responsavel_tipo" varchar(32) DEFAULT 'NAO_ATRIBUIDO' NOT NULL,
	"responsavel_usuario_id" varchar(255),
	"responsavel_agente_id" varchar(255),
	"status" varchar(32) DEFAULT 'ABERTO' NOT NULL,
	"atribuido_por_usuario_id" varchar(255),
	"transferido_para_usuario_id" varchar(255),
	"transferencia_motivo" text,
	"prioridade" varchar(16),
	"categoria" varchar(64),
	"resumo" text,
	"resultado" text,
	"data_atribuicao" timestamp DEFAULT now() NOT NULL,
	"data_liberacao" timestamp,
	"data_ultima_entrada_cliente" timestamp,
	"data_primeira_resposta" timestamp,
	"data_ultima_resposta" timestamp,
	"data_resolucao" timestamp,
	"data_encerramento" timestamp,
	"encerrado_por_usuario_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_chat_assignments_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_chat_assignments_chat_id_fk"
		FOREIGN KEY ("chat_id") REFERENCES "ampmais_chats"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_chat_assignments_responsavel_usuario_id_fk"
		FOREIGN KEY ("responsavel_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_atribuido_por_usuario_id_fk"
		FOREIGN KEY ("atribuido_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_transferido_para_usuario_id_fk"
		FOREIGN KEY ("transferido_para_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_encerrado_por_usuario_id_fk"
		FOREIGN KEY ("encerrado_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE INDEX "idx_chat_assignments_chat_status" ON "ampmais_chat_assignments" ("chat_id", "status");
CREATE INDEX "idx_chat_assignments_organizacao_usuario" ON "ampmais_chat_assignments" ("organizacao_id", "responsavel_usuario_id");

-- A garantia central do modelo: um unico atendimento ativo por chat.
-- E o que torna seguros o onConflictDoNothing dos webhooks concorrentes e os
-- compare-and-set de assumir/claim em lib/chats/attendance-state.ts.
CREATE UNIQUE INDEX "idx_chat_assignments_one_current_per_chat"
	ON "ampmais_chat_assignments" ("chat_id")
	WHERE "status" NOT IN ('ENCERRADO', 'CANCELADO');

-- ─── 3. chats: colunas novas ────────────────────────────────────────────────
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_mensagem_entrada_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_mensagem_saida_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "whatsapp_janela_data_expiracao" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_leitura_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_leitura_por_usuario_id" varchar(255);
ALTER TABLE "ampmais_chats" ADD CONSTRAINT "ampmais_chats_ultima_leitura_por_usuario_id_fk"
	FOREIGN KEY ("ultima_leitura_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null;

-- O codigo novo nao escreve mais estas colunas; relaxa o NOT NULL para os inserts nao quebrarem.
ALTER TABLE "ampmais_chats" ALTER COLUMN "ultima_mensagem_conteudo_tipo" DROP NOT NULL;

-- Backfill de entrada/saida.
UPDATE "ampmais_chats"
SET "ultima_mensagem_entrada_data" = "ultima_interacao_cliente_data"
WHERE "ultima_interacao_cliente_data" IS NOT NULL;

UPDATE "ampmais_chats" c
SET "ultima_mensagem_saida_data" = s."ultima_saida"
FROM (
	SELECT "chat_id", MAX("data_envio") AS "ultima_saida"
	FROM "ampmais_chat_messages"
	WHERE "autor_tipo" <> 'CLIENTE'
	GROUP BY "chat_id"
) s
WHERE c."id" = s."chat_id";

-- Janela de 24h so existe para conexoes Meta Cloud API; INTERNAL_GATEWAY fica NULL.
UPDATE "ampmais_chats" c
SET "whatsapp_janela_data_expiracao" = c."ultima_interacao_cliente_data" + interval '24 hours'
FROM "ampmais_whatsapp_connections" wc
WHERE c."whatsapp_conexao_id" = wc."id"
	AND wc."tipo_conexao" = 'META_CLOUD_API'
	AND c."ultima_interacao_cliente_data" IS NOT NULL
	AND c."ultima_interacao_cliente_data" + interval '24 hours' > now();

-- ─── 4. chats: merge de duplicatas da chave natural ────────────────────────
-- Elege o chat com ultima_mensagem_data mais recente por
-- (organizacao_id, cliente_id, whatsapp_telefone_id) como sobrevivente; move
-- mensagens e servicos, consolida contadores e apaga os orfaos.
-- Precisa rodar ANTES do indice unico e DEPOIS do backfill de datas.

CREATE TEMP TABLE "tmp_chat_merge" ON COMMIT DROP AS
SELECT
	"id",
	FIRST_VALUE("id") OVER (
		PARTITION BY "organizacao_id", "cliente_id", "whatsapp_telefone_id"
		ORDER BY "ultima_mensagem_data" DESC, "id" DESC
	) AS "sobrevivente_id",
	"mensagens_nao_lidas",
	"ultima_interacao_cliente_data"
FROM "ampmais_chats"
WHERE "whatsapp_telefone_id" IS NOT NULL;

UPDATE "ampmais_chat_messages" m
SET "chat_id" = t."sobrevivente_id"
FROM "tmp_chat_merge" t
WHERE m."chat_id" = t."id" AND t."id" <> t."sobrevivente_id";

UPDATE "ampmais_chat_services" s
SET "chat_id" = t."sobrevivente_id"
FROM "tmp_chat_merge" t
WHERE s."chat_id" = t."id" AND t."id" <> t."sobrevivente_id";

-- O chat sobrevivente herda a soma das nao-lidas e a entrada mais recente dos duplicados.
UPDATE "ampmais_chats" c
SET
	"mensagens_nao_lidas" = c."mensagens_nao_lidas" + COALESCE(a."nao_lidas_extra", 0),
	"ultima_mensagem_entrada_data" = GREATEST(c."ultima_mensagem_entrada_data", a."ultima_entrada")
FROM (
	SELECT
		"sobrevivente_id",
		SUM("mensagens_nao_lidas") FILTER (WHERE "id" <> "sobrevivente_id") AS "nao_lidas_extra",
		MAX("ultima_interacao_cliente_data") AS "ultima_entrada"
	FROM "tmp_chat_merge"
	GROUP BY "sobrevivente_id"
	HAVING COUNT(*) > 1
) a
WHERE c."id" = a."sobrevivente_id";

-- ultima_mensagem_id pode apontar para uma mensagem que ficou no chat deletado;
-- as mensagens ja foram movidas, entao o ponteiro segue valido. Os chats duplicados
-- e suas atribuicoes (ainda inexistentes neste ponto) saem em cascata.
DELETE FROM "ampmais_chats"
WHERE "id" IN (SELECT "id" FROM "tmp_chat_merge" WHERE "id" <> "sobrevivente_id");

-- ─── 5. chats: indices e chave natural ─────────────────────────────────────
-- Parcial porque whatsapp_telefone_id e nullable e NULL nunca conflita no Postgres.
CREATE UNIQUE INDEX "idx_chats_chave_natural"
	ON "ampmais_chats" ("organizacao_id", "cliente_id", "whatsapp_telefone_id")
	WHERE "whatsapp_telefone_id" IS NOT NULL;

CREATE INDEX "idx_chats_organizacao_ultima_mensagem" ON "ampmais_chats" ("organizacao_id", "ultima_mensagem_data" DESC);
CREATE INDEX "idx_chats_conexao_telefone_ultima_mensagem" ON "ampmais_chats" ("whatsapp_conexao_telefone_id", "ultima_mensagem_data" DESC);

-- ─── 6. chat_messages: colunas novas ───────────────────────────────────────
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "cliente_id" varchar(255);
ALTER TABLE "ampmais_chat_messages" ADD CONSTRAINT "ampmais_chat_messages_cliente_id_fk"
	FOREIGN KEY ("cliente_id") REFERENCES "ampmais_clients"("id") ON DELETE cascade;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "cliente_mensagem_id" text;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "metadados" jsonb;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "whatsapp_echo" boolean DEFAULT false NOT NULL;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "status_entrega" "chat_message_delivery_status" DEFAULT 'PENDENTE' NOT NULL;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "provedor_status_data_atualizacao" timestamp;

-- Mensagens de midia sem legenda passam a gravar NULL em vez de string vazia.
ALTER TABLE "ampmais_chat_messages" ALTER COLUMN "conteudo_texto" DROP NOT NULL;

-- cliente_id so vira NOT NULL na 0053: o codigo antigo nao preenche a coluna
-- e continuaria inserindo mensagens ate o deploy do codigo novo.
UPDATE "ampmais_chat_messages" m
SET "cliente_id" = c."cliente_id"
FROM "ampmais_chats" c
WHERE m."chat_id" = c."id" AND m."cliente_id" IS NULL;

UPDATE "ampmais_chat_messages" SET "whatsapp_echo" = true WHERE "is_echo" = true;

UPDATE "ampmais_chat_messages"
SET "status_entrega" = CASE
	WHEN "status" = 'CANCELADO' THEN 'CANCELADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'PENDENTE' THEN 'PENDENTE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENVIADO'  THEN 'ENVIADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENTREGUE' THEN 'ENTREGUE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'LIDO'     THEN 'LIDA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'FALHOU'   THEN 'FALHA'::"chat_message_delivery_status"
	ELSE 'ENVIADA'::"chat_message_delivery_status"
END;

CREATE INDEX "idx_chat_messages_chat_timeline" ON "ampmais_chat_messages" ("chat_id", "data_envio" DESC, "id" DESC);
CREATE INDEX "idx_chat_messages_whatsapp_message_id" ON "ampmais_chat_messages" ("whatsapp_message_id");
CREATE INDEX "idx_chat_messages_cliente_mensagem_id" ON "ampmais_chat_messages" ("cliente_mensagem_id");
CREATE INDEX "idx_chat_messages_organizacao_data_envio" ON "ampmais_chat_messages" ("organizacao_id", "data_envio" DESC);

-- ─── 7. Backfill de chat_assignments a partir de chat_services ─────────────
-- Bloco RE-EXECUTAVEL: so cria assignment para chats que ainda nao tem um ativo.
-- Repetido no topo da 0053 para capturar o que o codigo antigo escrever no intervalo.

-- Por chat, so o servico legado mais recente entre os abertos vira o assignment ativo.
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

-- USUARIO sem usuario real e incoerente com a semantica do tipo: vira fila.
UPDATE "ampmais_chat_assignments"
SET "responsavel_tipo" = 'NAO_ATRIBUIDO'
WHERE "responsavel_tipo" = 'USUARIO' AND "responsavel_usuario_id" IS NULL;

-- Chats sem servico legado tambem precisam de ticket, para o hub nao depender
-- de lazy-create no primeiro acesso.
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
