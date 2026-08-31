import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { connection, db } from "@/services/drizzle";

const IFOOD_POLLING_LOCK_NAMESPACE = 746_663; // "IFOOD" em um namespace privado da aplicacao.
const IFOOD_POLLING_LOCK_KEY = 1;

type TIfoodPollingCollectionResult = Awaited<ReturnType<typeof runDataCollectingV2>>;

export type TIfoodPollingCycle = {
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	summaries: number;
	errors: number;
	result: TIfoodPollingCollectionResult;
};

export type TIfoodPollingResult = {
	state: "COMPLETED" | "SKIPPED_OVERLAP" | "NO_ACTIVE_INTEGRATIONS";
	integrationIds: string[];
	cycles: TIfoodPollingCycle[];
	durationMs: number;
};

async function collectIfoodIntegrations(integrationIds: string[]): Promise<TIfoodPollingCycle> {
	const startedAt = new Date();
	const result = await runDataCollectingV2({ integrationIds });
	const finishedAt = new Date();

	return {
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationMs: finishedAt.getTime() - startedAt.getTime(),
		summaries: result.summaries.length,
		errors: result.errors.length,
		result,
	};
}

/**
 * Executa um ciclo curto de polling do iFood. O Supabase Cron define a frequencia; o advisory lock
 * impede que uma chamada atrasada ou duplicada concorra com o ciclo anterior.
 */
export async function runIfoodPollingCycle(): Promise<TIfoodPollingResult> {
	const cycleStartedAt = Date.now();

	return connection.begin(async (transaction) => {
		const [lock] = await transaction<{ acquired: boolean }[]>`
			select pg_try_advisory_xact_lock(${IFOOD_POLLING_LOCK_NAMESPACE}, ${IFOOD_POLLING_LOCK_KEY}) as acquired
		`;
		if (!lock?.acquired) {
			console.warn("[IFOOD_POLLING_CRON] Ciclo ignorado porque outra invocacao ainda possui o lock.");
			return { state: "SKIPPED_OVERLAP", integrationIds: [], cycles: [], durationMs: Date.now() - cycleStartedAt };
		}

		const integrations = await getActiveDataSourceIntegrations({ executor: db, types: ["IFOOD"] });
		const integrationIds = integrations.map((integration) => integration.id);
		if (integrationIds.length === 0) {
			return { state: "NO_ACTIVE_INTEGRATIONS", integrationIds, cycles: [], durationMs: Date.now() - cycleStartedAt };
		}

		const cycle = await collectIfoodIntegrations(integrationIds);

		return {
			state: "COMPLETED",
			integrationIds,
			cycles: [cycle],
			durationMs: Date.now() - cycleStartedAt,
		};
	});
}
