import type { TExternalEventSourceEnum } from "@/schemas/enums";
import { index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { externalEventProcessingStatusEnum } from "./enums";
import { organizations } from "./organizations";

/**
 * Inbox de eventos externos (webhooks): arquivo durável dos payloads brutos, gravado após a
 * autenticação e ANTES de qualquer processamento. Write-only para o negócio em v1 — a
 * deduplicação de processamento continua onde sempre esteve (índice de wamid, idempotencyKey
 * da fila); esta tabela entrega durabilidade, observabilidade (status por evento) e replay.
 *
 * 1 linha por payload distinto: a chave de idempotência é o hash canônico do body, então
 * retries do provider com body idêntico colapsam na mesma linha (é redelivery, não evento
 * novo). Retenção de 30 dias via cron `retention-cleanup`; deleção por organização em
 * lib/organizations/deletion.ts. Plano: docs/dev-planning/sync-skip-and-webhook-inbox-plan.md.
 */
export const externalEvents = newTable(
	"external_events",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		// nullable: o webhook chega antes da resolução de organização; o pós-processamento
		// backfilla quando a org é resolvível sem ambiguidade (a deleção por org depende disso;
		// linhas não carimbadas caem na retenção de 30 dias).
		organizacaoId: varchar("organizacao_id", { length: 255 }).references(() => organizations.id, { onDelete: "set null" }),
		origem: varchar("origem", { length: 64 }).$type<TExternalEventSourceEnum>().notNull(),
		// Classificação rasa para consulta (ex.: MESSAGES/STATUSES/TEMPLATE/MISTO na Meta; o
		// nome do evento no gateway). Texto livre: classificar melhor não custa migração.
		tipo: text("tipo").notNull(),
		chaveIdempotencia: text("chave_idempotencia").notNull(),
		payload: jsonb("payload").notNull(),
		processamentoStatus: externalEventProcessingStatusEnum("processamento_status").notNull().default("RECEBIDO"),
		processamentoData: timestamp("processamento_data"),
		// Truncado na escrita (lib/external-events/archive.ts) — diagnóstico, não stack completo.
		processamentoUltimoErro: text("processamento_ultimo_erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		origemChaveIdx: uniqueIndex("idx_external_events_origem_chave").on(table.origem, table.chaveIdempotencia),
		dataInsercaoIdx: index("idx_external_events_data_insercao").on(table.dataInsercao),
		organizacaoIdx: index("idx_external_events_organizacao").on(table.organizacaoId),
	}),
);

export type TExternalEventEntity = typeof externalEvents.$inferSelect;
export type TNewExternalEventEntity = typeof externalEvents.$inferInsert;
