import "@/utils/scripts/load-next-env";
import { connection, db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

const DEFAULT_CAMPAIGN_ID = "3f401f0a-c420-4a54-87ba-097072190f02";
const DELIVERY_STATUSES = ["ENVIADO", "ENTREGUE", "LIDO"] as const;

type TScriptOptions = {
	mode: "preview" | "run";
	campaignId: string;
};

function getArgValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readOptions(): TScriptOptions {
	const modeValue = getArgValue("mode");

	return {
		mode: modeValue === "run" ? "run" : "preview",
		campaignId: getArgValue("campaign-id") ?? DEFAULT_CAMPAIGN_ID,
	};
}

async function getBackfillPreview(campaignId: string) {
	const rows = await db
		.select({
			statusEnvio: interactions.statusEnvio,
			total: sql<number>`count(*)::int`,
			missingDataExecucao: sql<number>`count(*) filter (where ${interactions.dataExecucao} is null)::int`,
			missingDataEnvio: sql<number>`count(*) filter (where ${interactions.dataEnvio} is null)::int`,
		})
		.from(interactions)
		.where(and(eq(interactions.campanhaId, campaignId), inArray(interactions.statusEnvio, [...DELIVERY_STATUSES])))
		.groupBy(interactions.statusEnvio)
		.orderBy(interactions.statusEnvio);

	const [wouldUpdateDataExecucao] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(interactions)
		.where(and(eq(interactions.campanhaId, campaignId), inArray(interactions.statusEnvio, [...DELIVERY_STATUSES]), isNull(interactions.dataExecucao)));

	const [wouldUpdateDataEnvio] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(interactions)
		.where(and(eq(interactions.campanhaId, campaignId), inArray(interactions.statusEnvio, [...DELIVERY_STATUSES]), isNull(interactions.dataEnvio)));

	return {
		byStatus: rows,
		wouldUpdateDataExecucao: Number(wouldUpdateDataExecucao?.total ?? 0),
		wouldUpdateDataEnvio: Number(wouldUpdateDataEnvio?.total ?? 0),
	};
}

async function runBackfill(campaignId: string) {
	const updatedDataExecucao = await db
		.update(interactions)
		.set({
			dataExecucao: sql`coalesce(${interactions.dataEnvio}, ${interactions.dataInsercao})`,
		})
		.where(and(eq(interactions.campanhaId, campaignId), inArray(interactions.statusEnvio, [...DELIVERY_STATUSES]), isNull(interactions.dataExecucao)))
		.returning({ id: interactions.id });

	const updatedDataEnvio = await db
		.update(interactions)
		.set({
			dataEnvio: sql`coalesce(${interactions.dataExecucao}, ${interactions.dataInsercao})`,
		})
		.where(and(eq(interactions.campanhaId, campaignId), inArray(interactions.statusEnvio, [...DELIVERY_STATUSES]), isNull(interactions.dataEnvio)))
		.returning({ id: interactions.id });

	return {
		updatedDataExecucao: updatedDataExecucao.length,
		updatedDataEnvio: updatedDataEnvio.length,
	};
}

async function main() {
	const options = readOptions();
	const before = await getBackfillPreview(options.campaignId);

	console.log("[BACKFILL_CAMPAIGN_INTERACTION_DELIVERY_DATES] Preview", {
		mode: options.mode,
		campaignId: options.campaignId,
		...before,
	});

	if (options.mode !== "run") {
		console.log("[BACKFILL_CAMPAIGN_INTERACTION_DELIVERY_DATES] Dry-run only. Use --mode=run para aplicar.");
		return;
	}

	const result = await runBackfill(options.campaignId);
	const after = await getBackfillPreview(options.campaignId);

	console.log("[BACKFILL_CAMPAIGN_INTERACTION_DELIVERY_DATES] Done", {
		...result,
		after,
	});
}

main()
	.catch((error) => {
		console.error("[BACKFILL_CAMPAIGN_INTERACTION_DELIVERY_DATES] Fatal error", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
