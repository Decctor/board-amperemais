import "@/utils/scripts/load-next-env";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { processOrganizationInteractionsBatch, type ImmediateProcessingData } from "@/lib/interactions";
import { connection, db } from "@/services/drizzle";
import { clients, interactions } from "@/services/drizzle/schema";
import type { TInteractionEntity } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

const DEFAULT_CAMPAIGN_ID = "3f401f0a-c420-4a54-87ba-097072190f02";
const DEFAULT_ENQUEUE_CHUNK_SIZE = 1000;
const DEFAULT_PROCESS_BATCH_SIZE = 100;
const DEFAULT_SEND_CONCURRENCY = 5;
const DEFAULT_BATCH_DELAY_MS = 1000;

type TScriptOptions = {
	mode: "preview" | "run";
	campaignId: string;
	enqueueChunkSize: number;
	processBatchSize: number;
	sendConcurrency: number;
	batchDelayMs: number;
	processLimit: number | null;
	retryFailed: boolean;
	skipSend: boolean;
};

type TCampaignContext = NonNullable<Awaited<ReturnType<typeof loadCampaignContext>>>;
type TInteractionToProcess = { id: string; clienteId: string };

function getCampaignOrganizationId(campaign: TCampaignContext): string {
	if (!campaign.organizacaoId) {
		throw new Error(`Campanha ${campaign.id} sem organizacaoId.`);
	}

	return campaign.organizacaoId;
}

function getArgValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function readPositiveInteger(name: string, fallback: number): number {
	const value = getArgValue(name);
	if (!value) return fallback;

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Parametro --${name} deve ser um inteiro positivo.`);
	}

	return parsed;
}

function readOptionalPositiveInteger(name: string): number | null {
	const value = getArgValue(name);
	if (!value) return null;

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Parametro --${name} deve ser um inteiro positivo.`);
	}

	return parsed;
}

function readOptions(): TScriptOptions {
	const modeValue = getArgValue("mode");

	return {
		mode: modeValue === "run" ? "run" : "preview",
		campaignId: getArgValue("campaign-id") ?? DEFAULT_CAMPAIGN_ID,
		enqueueChunkSize: readPositiveInteger("enqueue-chunk-size", DEFAULT_ENQUEUE_CHUNK_SIZE),
		processBatchSize: readPositiveInteger("process-batch-size", DEFAULT_PROCESS_BATCH_SIZE),
		sendConcurrency: readPositiveInteger("send-concurrency", DEFAULT_SEND_CONCURRENCY),
		batchDelayMs: readPositiveInteger("batch-delay-ms", DEFAULT_BATCH_DELAY_MS),
		processLimit: readOptionalPositiveInteger("process-limit"),
		retryFailed: hasFlag("retry-failed"),
		skipSend: hasFlag("skip-send"),
	};
}

function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadCampaignContext(campaignId: string) {
	return db.query.campaigns.findFirst({
		where: (fields, { eq }) => eq(fields.id, campaignId),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
			whatsappConexaoTelefone: {
				columns: {
					id: true,
					whatsappTelefoneId: true,
				},
				with: {
					conexao: {
						columns: {
							tipoConexao: true,
							token: true,
							gatewaySessaoId: true,
						},
					},
				},
			},
		},
	});
}

async function loadExistingInteractions(campaignId: string) {
	return db.query.interactions.findMany({
		where: (fields, { eq }) => eq(fields.campanhaId, campaignId),
		columns: {
			id: true,
			clienteId: true,
			statusEnvio: true,
			dataExecucao: true,
			metadados: true,
			erroEnvio: true,
		},
	});
}

async function loadAbandonedPendingInteractions(campaignId: string): Promise<TInteractionToProcess[]> {
	return db
		.select({ id: interactions.id, clienteId: interactions.clienteId })
		.from(interactions)
		.where(
			and(
				eq(interactions.campanhaId, campaignId),
				eq(interactions.statusEnvio, "PENDENTE"),
				or(
					isNull(interactions.metadados),
					and(
						sql`NOT (${interactions.metadados} ? 'jobId')`,
						sql`NOT (${interactions.metadados} ? 'clientMessageId')`,
						sql`NOT (${interactions.metadados} ? 'whatsappMessageId')`,
						sql`NOT (${interactions.metadados} ? 'emailMessageId')`,
					),
				),
			),
		);
}

async function resetInteractionsForRetry({ organizationId, interactionIds }: { organizationId: string; interactionIds: string[] }) {
	if (interactionIds.length === 0) return 0;

	const updated = await db
		.update(interactions)
		.set({
			dataExecucao: null,
			statusEnvio: null,
			erroEnvio: null,
		})
		.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, interactionIds)))
		.returning({ id: interactions.id });

	return updated.length;
}

async function enqueueMissingInteractions({
	campaign,
	clientIds,
	chunkSize,
}: {
	campaign: TCampaignContext;
	clientIds: string[];
	chunkSize: number;
}) {
	const organizationId = getCampaignOrganizationId(campaign);
	const inserted: TInteractionToProcess[] = [];
	const chunks = chunkArray(clientIds, chunkSize);

	for (const [index, chunk] of chunks.entries()) {
		const chunkInserted = await db
			.insert(interactions)
			.values(
				chunk.map((clientId) => ({
					clienteId: clientId,
					campanhaId: campaign.id,
					organizacaoId: organizationId,
					titulo: `Uso unico recuperado: ${campaign.titulo}`,
					tipo: "ENVIO-MENSAGEM" as const,
					descricao: campaign.descricao ?? `Campanha de uso unico recuperada: ${campaign.titulo}`,
					agendamentoDataReferencia: campaign.gatilhoUsoUnicoDataReferencia,
					agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco as TInteractionEntity["agendamentoBlocoReferencia"],
				})),
			)
			.returning({ id: interactions.id, clienteId: interactions.clienteId });

		inserted.push(...chunkInserted);
		console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Missing interactions chunk inserted", {
			chunkNumber: index + 1,
			chunksTotal: chunks.length,
			requested: chunk.length,
			inserted: chunkInserted.length,
		});
	}

	return inserted;
}

async function buildImmediateProcessingData({
	campaign,
	items,
}: {
	campaign: TCampaignContext;
	items: TInteractionToProcess[];
}): Promise<ImmediateProcessingData[]> {
	if (items.length === 0) return [];

	const organizationId = getCampaignOrganizationId(campaign);
	const clientIds = items.map((item) => item.clienteId);
	const clientsData = await db.query.clients.findMany({
		where: (fields, { inArray }) => inArray(fields.id, clientIds),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
			analiseRFMTitulo: true,
			metadataProdutoMaisCompradoId: true,
			metadataGrupoProdutoMaisComprado: true,
			metadataProdutoSugeridoId: true,
		},
	});
	const clientsById = new Map(clientsData.map((client) => [client.id, client]));

	return items.flatMap((item) => {
		const client = clientsById.get(item.clienteId);
		if (!client) return [];

		return [
			{
				interactionId: item.id,
				organizationId,
				client: {
					id: client.id,
					nome: client.nome,
					telefone: client.telefone,
					email: client.email,
					analiseRFMTitulo: client.analiseRFMTitulo,
					metadataProdutoMaisCompradoId: client.metadataProdutoMaisCompradoId,
					metadataGrupoProdutoMaisComprado: client.metadataGrupoProdutoMaisComprado,
					metadataProdutoSugeridoId: client.metadataProdutoSugeridoId,
				},
				campaign: {
					autorId: campaign.autorId,
					whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
					whatsappTemplate: campaign.whatsappTemplate,
				},
				whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.tipoConexao === "META_CLOUD_API" ? campaign.whatsappConexaoTelefone.conexao.token ?? undefined : undefined,
				whatsappSessionId:
					campaign.whatsappConexaoTelefone?.conexao?.tipoConexao === "INTERNAL_GATEWAY"
						? campaign.whatsappConexaoTelefone.conexao.gatewaySessaoId ?? undefined
						: undefined,
			},
		] satisfies ImmediateProcessingData[];
	});
}

async function processInteractions({
	campaign,
	items,
	options,
}: {
	campaign: TCampaignContext;
	items: TInteractionToProcess[];
	options: TScriptOptions;
}) {
	const organizationId = getCampaignOrganizationId(campaign);
	const limitedItems = options.processLimit == null ? items : items.slice(0, options.processLimit);
	const batches = chunkArray(limitedItems, options.processBatchSize);
	const weeklyLimitCache = createCampaignWeeklyLimitCache();
	let sent = 0;
	let queued = 0;
	let failed = 0;
	let blocked = 0;
	let alreadyReserved = 0;
	let missing = 0;

	for (const [index, batch] of batches.entries()) {
		const interactionsToProcess = await buildImmediateProcessingData({ campaign, items: batch });
		const result = await processOrganizationInteractionsBatch({
			organizationId,
			interactions: interactionsToProcess,
			sendConcurrency: options.sendConcurrency,
			weeklyLimitCache,
		});

		sent += result.sent;
		queued += result.queued;
		failed += result.failed;
		blocked += result.blocked;
		alreadyReserved += result.alreadyReserved;
		missing += result.missing;

		console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Process batch finished", {
			batchNumber: index + 1,
			batchesTotal: batches.length,
			total: result.total,
			claimed: result.claimed,
			sent: result.sent,
			queued: result.queued,
			blocked: result.blocked,
			failed: result.failed,
			alreadyReserved: result.alreadyReserved,
			missing: result.missing,
			durationMs: result.durationMs,
		});

		if (index < batches.length - 1) {
			await delay(options.batchDelayMs);
		}
	}

	return {
		totalRequestedForProcessing: limitedItems.length,
		sent,
		queued,
		failed,
		blocked,
		alreadyReserved,
		missing,
	};
}

async function main() {
	const options = readOptions();
	const campaign = await loadCampaignContext(options.campaignId);
	if (!campaign) throw new Error(`Campanha ${options.campaignId} nao encontrada.`);
	if (!campaign.whatsappTemplate) throw new Error(`Campanha ${options.campaignId} sem template.`);
	const organizationId = getCampaignOrganizationId(campaign);

	const [targetClientIds, existingInteractions, abandonedPendingInteractions] = await Promise.all([
		resolveCampaignAudienceClientIdsForCampaign({
			executor: db,
			organizationId,
			campaign,
		}),
		loadExistingInteractions(campaign.id),
		loadAbandonedPendingInteractions(campaign.id),
	]);

	const existingClientIds = new Set(existingInteractions.map((interaction) => interaction.clienteId));
	const missingClientIds = targetClientIds.filter((clientId) => !existingClientIds.has(clientId));
	const failedInteractions = existingInteractions.filter((interaction) => interaction.statusEnvio === "FALHOU");
	const retryFailedInteractions = options.retryFailed ? failedInteractions.map((interaction) => ({ id: interaction.id, clienteId: interaction.clienteId })) : [];
	const recoveryLimit = options.processLimit ?? Number.POSITIVE_INFINITY;
	const abandonedPendingForRun = abandonedPendingInteractions.slice(0, recoveryLimit);
	const remainingAfterPending = Math.max(recoveryLimit - abandonedPendingForRun.length, 0);
	const retryFailedForRun = retryFailedInteractions.slice(0, remainingAfterPending);
	const remainingAfterRetryFailed = Math.max(remainingAfterPending - retryFailedForRun.length, 0);
	const missingClientIdsForRun = missingClientIds.slice(0, remainingAfterRetryFailed);

	console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Preview", {
		mode: options.mode,
		campaignId: campaign.id,
		organizationId,
		targetClients: targetClientIds.length,
		existingInteractions: existingInteractions.length,
		missingInteractionsToCreate: missingClientIds.length,
		abandonedPendingToRetry: abandonedPendingInteractions.length,
		failedInteractions: failedInteractions.length,
		retryFailed: options.retryFailed,
		skipSend: options.skipSend,
		processLimit: options.processLimit,
		willCreateMissingInteractions: missingClientIdsForRun.length,
		willRetryAbandonedPending: abandonedPendingForRun.length,
		willRetryFailed: retryFailedForRun.length,
	});

	if (options.mode !== "run") {
		console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Dry-run only. Use --mode=run para criar/reprocessar.");
		return;
	}

	const insertedMissingInteractions = await enqueueMissingInteractions({
		campaign,
		clientIds: missingClientIdsForRun,
		chunkSize: options.enqueueChunkSize,
	});

	const retryItems = [...abandonedPendingForRun, ...retryFailedForRun];
	const resetCount = await resetInteractionsForRetry({
		organizationId,
		interactionIds: retryItems.map((item) => item.id),
	});

	console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Recovery enqueue/reset finished", {
		insertedMissingInteractions: insertedMissingInteractions.length,
		resetForRetry: resetCount,
	});

	if (options.skipSend) {
		console.log("[RECOVER_SINGLE_USE_CAMPAIGN] skipSend=true. Interacoes criadas/resetadas, mas nao processadas.");
		return;
	}

	const processingSummary = await processInteractions({
		campaign,
		items: [...retryItems, ...insertedMissingInteractions],
		options,
	});

	console.log("[RECOVER_SINGLE_USE_CAMPAIGN] Done", processingSummary);
}

main()
	.catch((error) => {
		console.error("[RECOVER_SINGLE_USE_CAMPAIGN] Fatal error", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
