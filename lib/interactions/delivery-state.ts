import type { TInteractionsStatusEnum } from "@/schemas/interactions";
import { db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import { sql } from "drizzle-orm";

const PROGRESSIVE_DELIVERY_STATUS_RANK: Partial<Record<TInteractionsStatusEnum, number>> = {
	PENDENTE: 0,
	ENVIADO: 1,
	ENTREGUE: 2,
	LIDO: 3,
};

type TUpdateInteractionDeliveryStateInput = {
	interactionId: string;
	organizationId?: string;
	statusEnvio: TInteractionsStatusEnum;
	erroEnvio?: string | null;
	metadataPatch?: Record<string, unknown>;
	occurredAt?: Date;
	preventStatusDowngrade?: boolean;
};

type TUpdateInteractionDeliveryStateOutput = {
	updated: boolean;
	interactionId: string;
	previousStatus: TInteractionsStatusEnum | null;
	nextStatus: TInteractionsStatusEnum;
	statusChanged: boolean;
};

// Atualiza o estado de entrega em um único UPDATE condicional (1 round-trip, sem transação explícita
// nem lock prolongado). A atomicidade do statement garante read-modify-write seguro contra escritas
// concorrentes (ex.: webhook de entrega correndo com o path de envio).
//
// A regra de status espelha a antiga resolveNextStatus() quando preventStatusDowngrade está ativo:
//   - status atual nulo OU prevenção desligada  -> aplica o incoming
//   - atual = BLOQUEADA e incoming != BLOQUEADA -> mantém o atual
//   - rank(atual) > rank(incoming)              -> mantém o atual (PENDENTE<ENVIADO<ENTREGUE<LIDO)
//   - atual em (ENTREGUE, LIDO) e incoming FALHOU -> mantém o atual
//   - caso contrário                            -> aplica o incoming
export async function updateInteractionDeliveryState({
	interactionId,
	organizationId,
	statusEnvio,
	erroEnvio,
	metadataPatch,
	occurredAt,
	preventStatusDowngrade = true,
}: TUpdateInteractionDeliveryStateInput): Promise<TUpdateInteractionDeliveryStateOutput> {
	const incoming = statusEnvio;
	const incomingRank = PROGRESSIVE_DELIVERY_STATUS_RANK[incoming] ?? null;
	// ISO-8601 + cast explícito (convenção do repo, ex.: cron enrich-clients) para evitar ambiguidade
	// de codificação de Date no driver ao escrever em colunas `timestamp`.
	const timestampIso = (occurredAt ?? new Date()).toISOString();
	const patchJson = JSON.stringify(metadataPatch ?? {});

	// Próximo status considerando a prevenção de downgrade. Referencia i.status_envio (valor ANTIGO da
	// linha, conforme semântica do UPDATE no Postgres). A ramificação em JS evita interpolar booleano
	// JS diretamente no WHEN (SQL inválido ou ambíguo dependendo do driver).
	const nextStatusSql = preventStatusDowngrade
		? sql`CASE
			WHEN i.status_envio IS NULL THEN ${incoming}
			WHEN i.status_envio = 'BLOQUEADA' AND ${incoming} <> 'BLOQUEADA' THEN i.status_envio
			WHEN ${incomingRank}::int IS NOT NULL
				AND (CASE i.status_envio WHEN 'PENDENTE' THEN 0 WHEN 'ENVIADO' THEN 1 WHEN 'ENTREGUE' THEN 2 WHEN 'LIDO' THEN 3 ELSE NULL END) > ${incomingRank}::int
				THEN i.status_envio
			WHEN i.status_envio IN ('ENTREGUE', 'LIDO') AND ${incoming} = 'FALHOU' THEN i.status_envio
			ELSE ${incoming}
		END`
		: sql`${incoming}`;

	// erro_envio só muda quando o status incoming foi de fato aplicado. Quando o caller não passa
	// erroEnvio (undefined), limpamos o erro apenas em status não-falha/não-bloqueio.
	const erroEnvioSql =
		erroEnvio !== undefined
			? sql`CASE WHEN (${nextStatusSql}) = ${incoming} THEN ${erroEnvio} ELSE i.erro_envio END`
			: sql`CASE WHEN (${nextStatusSql}) = ${incoming} AND (${nextStatusSql}) NOT IN ('FALHOU', 'BLOQUEADA') THEN NULL ELSE i.erro_envio END`;

	const selectWhereSql = organizationId
		? sql`id = ${interactionId} AND organizacao_id = ${organizationId}`
		: sql`id = ${interactionId}`;

	const result = await db.execute(sql`
		WITH prev AS (
			SELECT id, status_envio FROM ${interactions} WHERE ${selectWhereSql}
		)
		UPDATE ${interactions} AS i SET
			status_envio = (${nextStatusSql}),
			erro_envio = (${erroEnvioSql}),
			data_execucao = CASE WHEN (${nextStatusSql}) IN ('ENVIADO', 'ENTREGUE', 'LIDO') THEN COALESCE(i.data_execucao, ${timestampIso}::timestamp) ELSE i.data_execucao END,
			data_envio = CASE WHEN (${nextStatusSql}) IN ('ENVIADO', 'ENTREGUE', 'LIDO') THEN COALESCE(i.data_envio, ${timestampIso}::timestamp) ELSE i.data_envio END,
			metadados = COALESCE(i.metadados, '{}'::jsonb) || ${patchJson}::jsonb
		FROM prev
		WHERE i.id = prev.id
		RETURNING prev.status_envio AS previous_status, i.status_envio AS next_status
	`);

	const row = result[0] as { previous_status: TInteractionsStatusEnum | null; next_status: TInteractionsStatusEnum } | undefined;

	if (!row) {
		return {
			updated: false,
			interactionId,
			previousStatus: null,
			nextStatus: statusEnvio,
			statusChanged: false,
		};
	}

	const previousStatus = row.previous_status ?? null;
	return {
		updated: true,
		interactionId,
		previousStatus,
		nextStatus: row.next_status,
		statusChanged: previousStatus !== row.next_status,
	};
}

export function markInteractionQueued(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "PENDENTE" });
}

export function markInteractionSent(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "ENVIADO" });
}

export function markInteractionDelivered(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "ENTREGUE" });
}

export function markInteractionRead(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "LIDO" });
}

export function markInteractionFailed(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "FALHOU" });
}

export function markInteractionBlocked(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "BLOQUEADA" });
}
