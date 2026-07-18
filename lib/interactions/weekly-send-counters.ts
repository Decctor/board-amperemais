import { type DBTransaction, db } from "@/services/drizzle";
import { interactions, weeklySendCounters } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { sql } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);

const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";

type TWeeklyCounterExecutor = typeof db | DBTransaction;

export type TWeekWindow = {
	weekKey: string;
	startOfWeekDate: Date;
};

export function getWeekWindowForDate(date: Date): TWeekWindow {
	const referenceInCronTimezone = dayjs(date).tz(INTERACTIONS_CRON_TIMEZONE);
	const startOfWeekDate = referenceInCronTimezone.startOf("week").toDate();
	const weekReference = dayjs(startOfWeekDate).tz(INTERACTIONS_CRON_TIMEZONE);
	const weekKey = `${weekReference.year()}-W${String(weekReference.week()).padStart(2, "0")}`;

	return { weekKey, startOfWeekDate };
}

export function getCurrentWeekWindow(): TWeekWindow {
	return getWeekWindowForDate(new Date());
}

// Cria o contador (org: campaignId = null) caso ainda não exista, inicializando `usados` a partir
// do COUNT(*) das interações que consomem quota na semana — backfill preguiçoso que só importa na
// semana de cutover (semanas novas começam naturalmente em 0). O guard NOT EXISTS impede que o
// COUNT rode quando o contador já existe, mantendo o hot path O(1).
async function ensureWeeklySendCounter({
	executor,
	organizationId,
	campaignId,
	weekKey,
	startOfWeekDate,
}: {
	executor: TWeeklyCounterExecutor;
	organizationId: string;
	campaignId: string | null;
	weekKey: string;
	startOfWeekDate: Date;
}) {
	const rowId = crypto.randomUUID();
	const campaignFilterSql = campaignId == null ? sql`` : sql`AND i.campanha_id = ${campaignId}`;

	await executor.execute(sql`
		INSERT INTO ${weeklySendCounters} (id, organizacao_id, campanha_id, semana_chave, usados)
		SELECT ${rowId}, ${organizationId}, ${campaignId}, ${weekKey}, (
			SELECT COUNT(*)::int
			FROM ${interactions} i
			WHERE i.organizacao_id = ${organizationId}
				AND i.campanha_id IS NOT NULL
				${campaignFilterSql}
				AND i.tipo = 'ENVIO-MENSAGEM'
				AND i.status_envio IN ('PENDENTE', 'ENVIADO', 'ENTREGUE', 'LIDO')
				AND i.data_execucao >= ${startOfWeekDate.toISOString()}::timestamp
		)
		WHERE NOT EXISTS (
			SELECT 1 FROM ${weeklySendCounters} c
			WHERE c.organizacao_id = ${organizationId}
				AND c.campanha_id IS NOT DISTINCT FROM ${campaignId}
				AND c.semana_chave = ${weekKey}
		)
		ON CONFLICT (organizacao_id, campanha_id, semana_chave) DO NOTHING
	`);
}

export async function ensureWeeklySendCounters({
	executor = db,
	organizationId,
	campaignIds,
	weekKey,
	startOfWeekDate,
}: {
	executor?: TWeeklyCounterExecutor;
	organizationId: string;
	campaignIds: string[];
	weekKey: string;
	startOfWeekDate: Date;
}) {
	// Contador da organização primeiro, depois campanhas em ordem fixa — mesma ordem usada na
	// aquisição de locks, evitando deadlocks entre reservas concorrentes.
	await ensureWeeklySendCounter({ executor, organizationId, campaignId: null, weekKey, startOfWeekDate });
	for (const campaignId of [...campaignIds].sort()) {
		await ensureWeeklySendCounter({ executor, organizationId, campaignId, weekKey, startOfWeekDate });
	}
}

export type TLockedWeeklySendCounters = {
	organizationUsed: number;
	campaignUsedByCampaignId: Map<string, number>;
};

// Trava (FOR UPDATE) e lê os contadores da organização e das campanhas informadas. A ordenação
// campanha NULLS FIRST garante ordem de aquisição consistente (org antes das campanhas) em todas
// as reservas concorrentes — a serialização acontece apenas nestas linhas, por microssegundos,
// em vez do lock na própria linha da organização segurado durante COUNT(*)s como antes.
export async function lockWeeklySendCountersForUpdate({
	tx,
	organizationId,
	campaignIds,
	weekKey,
}: {
	tx: DBTransaction;
	organizationId: string;
	campaignIds: string[];
	weekKey: string;
}): Promise<TLockedWeeklySendCounters> {
	const campaignFilterSql =
		campaignIds.length > 0
			? sql`OR c.campanha_id IN (${sql.join(
					campaignIds.map((campaignId) => sql`${campaignId}`),
					sql`, `,
				)})`
			: sql``;

	const rows = (await tx.execute(sql`
		SELECT c.campanha_id, c.usados
		FROM ${weeklySendCounters} c
		WHERE c.organizacao_id = ${organizationId}
			AND c.semana_chave = ${weekKey}
			AND (c.campanha_id IS NULL ${campaignFilterSql})
		ORDER BY c.campanha_id ASC NULLS FIRST
		FOR UPDATE
	`)) as unknown as { campanha_id: string | null; usados: number }[];

	let organizationUsed = 0;
	const campaignUsedByCampaignId = new Map<string, number>();
	for (const row of rows) {
		if (row.campanha_id == null) {
			organizationUsed = Number(row.usados ?? 0);
			continue;
		}
		campaignUsedByCampaignId.set(row.campanha_id, Number(row.usados ?? 0));
	}

	return { organizationUsed, campaignUsedByCampaignId };
}

// Incrementa os contadores já travados por lockWeeklySendCountersForUpdate na mesma transação.
export async function applyWeeklySendCounterUsage({
	tx,
	organizationId,
	weekKey,
	organizationDelta,
	deltasByCampaignId,
}: {
	tx: DBTransaction;
	organizationId: string;
	weekKey: string;
	organizationDelta: number;
	deltasByCampaignId: Map<string, number>;
}) {
	if (organizationDelta > 0) {
		await tx.execute(sql`
			UPDATE ${weeklySendCounters}
			SET usados = usados + ${organizationDelta}
			WHERE organizacao_id = ${organizationId} AND campanha_id IS NULL AND semana_chave = ${weekKey}
		`);
	}

	for (const [campaignId, delta] of [...deltasByCampaignId.entries()].sort(([a], [b]) => a.localeCompare(b))) {
		if (delta <= 0) continue;
		await tx.execute(sql`
			UPDATE ${weeklySendCounters}
			SET usados = usados + ${delta}
			WHERE organizacao_id = ${organizationId} AND campanha_id = ${campaignId} AND semana_chave = ${weekKey}
		`);
	}
}

// Leitura sem lock, para checagens/estatísticas.
export async function getWeeklySendUsage({
	executor = db,
	organizationId,
	campaignId,
	weekKey,
}: {
	executor?: TWeeklyCounterExecutor;
	organizationId: string;
	campaignId: string;
	weekKey: string;
}): Promise<{ organizationUsed: number; campaignUsed: number }> {
	const rows = (await executor.execute(sql`
		SELECT c.campanha_id, c.usados
		FROM ${weeklySendCounters} c
		WHERE c.organizacao_id = ${organizationId}
			AND c.semana_chave = ${weekKey}
			AND (c.campanha_id IS NULL OR c.campanha_id = ${campaignId})
	`)) as unknown as { campanha_id: string | null; usados: number }[];

	let organizationUsed = 0;
	let campaignUsed = 0;
	for (const row of rows) {
		if (row.campanha_id == null) organizationUsed = Number(row.usados ?? 0);
		else campaignUsed = Number(row.usados ?? 0);
	}

	return { organizationUsed, campaignUsed };
}

// Devolve quota consumida por um envio que falhou/bloqueou terminalmente. Torna explícito o
// comportamento que antes era acidental (FALHOU/BLOQUEADA saíam dos statuses contados pelo
// COUNT(*)). A semana é a da reserva (claimedAt = data_execucao), não a atual — uma falha após a
// virada da semana devolve quota à semana em que foi consumida, espelhando a semântica antiga.
export async function releaseWeeklySendQuota({
	tx,
	organizationId,
	campaignId,
	claimedAt,
	count = 1,
}: {
	tx?: DBTransaction;
	organizationId: string;
	campaignId: string;
	claimedAt: Date;
	count?: number;
}) {
	return adjustWeeklySendQuota({ tx, organizationId, campaignId, claimedAt, delta: -count });
}

export async function adjustWeeklySendQuota({
	tx,
	organizationId,
	campaignId,
	claimedAt,
	delta,
}: {
	tx?: DBTransaction;
	organizationId: string;
	campaignId: string;
	claimedAt: Date;
	delta: number;
}) {
	if (delta === 0) return;

	// O caller de uma transição de entrega trava a interação antes daqui. Assim, caso o contador
	// ainda não exista, o backfill abaixo enxerga o status anterior e o delta representa exatamente
	// a transição corrente (inclusive FALHOU -> ENVIADO/ENTREGUE/LIDO).
	const { weekKey, startOfWeekDate } = getWeekWindowForDate(claimedAt);
	const applyAdjustment = async (executor: DBTransaction) => {
		await ensureWeeklySendCounters({
			executor,
			organizationId,
			campaignIds: [campaignId],
			weekKey,
			startOfWeekDate,
		});

		await executor.execute(sql`
			UPDATE ${weeklySendCounters}
			SET usados = GREATEST(usados + ${delta}, 0)
			WHERE organizacao_id = ${organizationId} AND campanha_id IS NULL AND semana_chave = ${weekKey}
		`);
		await executor.execute(sql`
			UPDATE ${weeklySendCounters}
			SET usados = GREATEST(usados + ${delta}, 0)
			WHERE organizacao_id = ${organizationId} AND campanha_id = ${campaignId} AND semana_chave = ${weekKey}
		`);
	};

	if (tx) return applyAdjustment(tx);
	return db.transaction(applyAdjustment);
}
