import { appApiHandler } from "@/lib/app-api";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { generateCashbackForCampaignBatch } from "@/lib/cashback/generate-campaign-cashback";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { notifyCampaignEnqueueFailure } from "@/lib/cron/notify-campaign-enqueue-failure";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { db } from "@/services/drizzle";
import { campaigns, interactions } from "@/services/drizzle/schema";
import type { TCampaignEntity, TInteractionEntity } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"] as const;
const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";
const IMMEDIATE_PROCESSING_CONCURRENCY = 5;
// Insertions are chunked so each transaction stays short and stays under Postgres'
// 65535 bind-parameter limit (interactions: ~8 columns, cashback: ~13 columns per row).
const ENQUEUE_CHUNK_SIZE = 1000;
const MAX_ENQUEUE_ATTEMPTS = 3;
const ENQUEUE_RETRY_BASE_DELAY_MS = 250;

type TTimeBlock = (typeof TIME_BLOCKS)[number];

type TOrganizationSingleUseSummary = {
	activeCampaigns: number;
	claimedCampaigns: number;
	targetClients: number;
	interactionsInserted: number;
	interactionsQueuedForImmediateProcessing: number;
	immediateEligibleWithoutDeliveryConfig: number;
	immediateEligibleWithoutClientData: number;
	cashbacksGenerated: number;
};

type TSingleUseCampaign = Awaited<ReturnType<typeof getSingleUseCampaignsForBlock>>[number];

function getTimeBlockMinutes(block: TTimeBlock): number {
	const [hour, minute] = block.split(":").map(Number);
	return hour * 60 + minute;
}

function getCurrentTimeBlock(currentTime = dayjs()): TTimeBlock {
	const currentTotalMinutes = currentTime.hour() * 60 + currentTime.minute();

	let closestBlock: TTimeBlock = TIME_BLOCKS[0];
	for (const block of TIME_BLOCKS) {
		if (getTimeBlockMinutes(block) <= currentTotalMinutes) {
			closestBlock = block;
			continue;
		}
		break;
	}

	return closestBlock;
}

function createOrganizationSummary(): TOrganizationSingleUseSummary {
	return {
		activeCampaigns: 0,
		claimedCampaigns: 0,
		targetClients: 0,
		interactionsInserted: 0,
		interactionsQueuedForImmediateProcessing: 0,
		immediateEligibleWithoutDeliveryConfig: 0,
		immediateEligibleWithoutClientData: 0,
		cashbacksGenerated: 0,
	};
}

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) return [array];

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}

	return chunks;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Erro desconhecido ao enfileirar interações.";
}

async function getSingleUseCampaignsForBlock({
	organizationId,
	currentDate,
	currentTimeBlock,
}: {
	organizationId: string;
	currentDate: string;
	currentTimeBlock: TTimeBlock;
}) {
	return db.query.campaigns.findMany({
		where: (fields, { and, eq }) =>
			and(
				eq(fields.organizacaoId, organizationId),
				eq(fields.ativo, true),
				eq(fields.gatilhoTipo, "USO-UNICO"),
				eq(fields.gatilhoUsoUnicoDataReferencia, currentDate),
				eq(fields.execucaoAgendadaBloco, currentTimeBlock as TCampaignEntity["execucaoAgendadaBloco"]),
			),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
			whatsappConexaoTelefone: {
				columns: {
					id: true,
				},
				with: {
					conexao: { columns: { token: true, gatewaySessaoId: true } },
				},
			},
		},
	});
}

// Inserts a chunk of interactions (and their FIXO cashback) in a single short transaction.
// On retries it first skips clients that already have an interaction for this campaign, so a
// previous attempt whose COMMIT acknowledgement was lost does not create duplicates.
async function enqueueCampaignChunk({
	organizationId,
	campaign,
	clientIds,
	currentDate,
	currentTimeBlock,
	cashbackActive,
	cashbackValue,
	isRetry,
}: {
	organizationId: string;
	campaign: TSingleUseCampaign;
	clientIds: string[];
	currentDate: string;
	currentTimeBlock: TTimeBlock;
	cashbackActive: boolean;
	cashbackValue: number;
	isRetry: boolean;
}): Promise<{ inserted: { id: string; clienteId: string }[]; cashbackGenerated: number }> {
	return db.transaction(async (tx) => {
		let clientIdsToInsert = clientIds;

		if (isRetry) {
			const existing = await tx
				.select({ clienteId: interactions.clienteId })
				.from(interactions)
				.where(and(eq(interactions.organizacaoId, organizationId), eq(interactions.campanhaId, campaign.id), inArray(interactions.clienteId, clientIds)));
			const existingClientIds = new Set(existing.map((row) => row.clienteId));
			clientIdsToInsert = clientIds.filter((clientId) => !existingClientIds.has(clientId));
		}

		if (clientIdsToInsert.length === 0) {
			return { inserted: [], cashbackGenerated: 0 };
		}

		const inserted = await tx
			.insert(interactions)
			.values(
				clientIdsToInsert.map((clientId) => ({
					clienteId: clientId,
					campanhaId: campaign.id,
					organizacaoId: organizationId,
					titulo: `Uso único: ${campaign.titulo}`,
					tipo: "ENVIO-MENSAGEM" as const,
					descricao: campaign.descricao ?? `Campanha de uso único: ${campaign.titulo}`,
					agendamentoDataReferencia: currentDate,
					agendamentoBlocoReferencia: currentTimeBlock as TInteractionEntity["agendamentoBlocoReferencia"],
				})),
			)
			.returning({ id: interactions.id, clienteId: interactions.clienteId });

		let cashbackGenerated = 0;
		if (cashbackActive && inserted.length > 0) {
			const { generatedCount } = await generateCashbackForCampaignBatch({
				tx,
				organizationId,
				campaignId: campaign.id,
				clientIds: inserted.map((row) => row.clienteId),
				cashbackValue,
				expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
				expirationValue: campaign.cashbackGeracaoExpiracaoValor,
			});
			cashbackGenerated = generatedCount;
		}

		return { inserted, cashbackGenerated };
	});
}

async function processSingleUseCampaign({
	organizationId,
	campaign,
	currentDate,
	currentTimeBlock,
	summary,
}: {
	organizationId: string;
	campaign: TSingleUseCampaign;
	currentDate: string;
	currentTimeBlock: TTimeBlock;
	summary: TOrganizationSingleUseSummary;
}) {
	// Atomic claim up front guards against overlapping cron runs processing the same campaign twice.
	const [claimedCampaign] = await db
		.update(campaigns)
		.set({ ativo: false })
		.where(and(eq(campaigns.id, campaign.id), eq(campaigns.organizacaoId, organizationId), eq(campaigns.ativo, true)))
		.returning({ id: campaigns.id });

	if (!claimedCampaign) {
		console.log(`[ORG: ${organizationId}] [CAMPAIGN: ${campaign.id}] Campaign was already claimed. Skipping.`);
		return;
	}

	summary.claimedCampaigns += 1;

	const targetClientIds = await resolveCampaignAudienceClientIdsForCampaign({
		executor: db,
		organizationId,
		campaign,
	});
	summary.targetClients += targetClientIds.length;

	console.log(`[ORG: ${organizationId}] [CAMPAIGN: ${campaign.id}] Found ${targetClientIds.length} matching clients.`);

	if (targetClientIds.length === 0) return;

	const hasDeliveryConfig = !!campaign.whatsappTemplate;
	const cashbackValue = campaign.cashbackGeracaoValor ?? 0;
	const cashbackActive = campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && cashbackValue > 0;
	const weeklyLimitCache = createCampaignWeeklyLimitCache();

	let campaignEnqueuedCount = 0;
	const failedClientIds: string[] = [];
	const enqueueErrors: string[] = [];

	const chunks = chunkArray(targetClientIds, ENQUEUE_CHUNK_SIZE);
	for (const chunk of chunks) {
		let inserted: { id: string; clienteId: string }[] | null = null;
		let lastError: unknown = null;

		for (let attempt = 1; attempt <= MAX_ENQUEUE_ATTEMPTS; attempt += 1) {
			try {
				const result = await enqueueCampaignChunk({
					organizationId,
					campaign,
					clientIds: chunk,
					currentDate,
					currentTimeBlock,
					cashbackActive,
					cashbackValue,
					isRetry: attempt > 1,
				});
				inserted = result.inserted;
				summary.cashbacksGenerated += result.cashbackGenerated;
				break;
			} catch (error) {
				lastError = error;
				console.error(`[ORG: ${organizationId}] [CAMPAIGN: ${campaign.id}] Enqueue attempt ${attempt} failed:`, getErrorMessage(error));
				if (attempt < MAX_ENQUEUE_ATTEMPTS) {
					await sleep(ENQUEUE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
				}
			}
		}

		if (!inserted) {
			failedClientIds.push(...chunk);
			enqueueErrors.push(getErrorMessage(lastError));
			continue;
		}

		summary.interactionsInserted += inserted.length;
		campaignEnqueuedCount += inserted.length;

		if (!hasDeliveryConfig) {
			summary.immediateEligibleWithoutDeliveryConfig += inserted.length;
			continue;
		}

		if (inserted.length === 0) continue;

		await processChunkImmediateInteractions({
			organizationId,
			campaign,
			inserted,
			weeklyLimitCache,
			summary,
		});
	}

	if (failedClientIds.length > 0) {
		console.error(
			`[ORG: ${organizationId}] [CAMPAIGN: ${campaign.id}] Failed to enqueue ${failedClientIds.length} clients after ${MAX_ENQUEUE_ATTEMPTS} attempts.`,
		);
		await notifyCampaignEnqueueFailure({
			organizationId,
			campaignId: campaign.id,
			campaignTitle: campaign.titulo,
			audienceSize: targetClientIds.length,
			enqueuedCount: campaignEnqueuedCount,
			failedClientIds,
			errors: enqueueErrors,
		});
	}
}

async function processChunkImmediateInteractions({
	organizationId,
	campaign,
	inserted,
	weeklyLimitCache,
	summary,
}: {
	organizationId: string;
	campaign: TSingleUseCampaign;
	inserted: { id: string; clienteId: string }[];
	weeklyLimitCache: ReturnType<typeof createCampaignWeeklyLimitCache>;
	summary: TOrganizationSingleUseSummary;
}) {
	const clientIds = inserted.map((row) => row.clienteId);
	const clientsData = await db.query.clients.findMany({
		where: (fields, { inArray: inArrayFilter }) => inArrayFilter(fields.id, clientIds),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
			analiseRFMTitulo: true,
			metadataProdutoMaisCompradoId: true,
			metadataGrupoProdutoMaisComprado: true,
		},
	});
	const clientDataById = new Map(clientsData.map((client) => [client.id, client]));

	const immediateProcessingDataList: ImmediateProcessingData[] = [];
	for (const row of inserted) {
		const clientData = clientDataById.get(row.clienteId);
		if (!clientData) {
			summary.immediateEligibleWithoutClientData += 1;
			continue;
		}

		summary.interactionsQueuedForImmediateProcessing += 1;
		immediateProcessingDataList.push({
			interactionId: row.id,
			organizationId,
			client: {
				id: clientData.id,
				nome: clientData.nome,
				telefone: clientData.telefone,
				email: clientData.email,
				analiseRFMTitulo: clientData.analiseRFMTitulo,
				metadataProdutoMaisCompradoId: clientData.metadataProdutoMaisCompradoId,
				metadataGrupoProdutoMaisComprado: clientData.metadataGrupoProdutoMaisComprado,
			},
			campaign: {
				autorId: campaign.autorId,
				whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
				whatsappTemplate: campaign.whatsappTemplate,
			},
			whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
			whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
		});
	}

	if (immediateProcessingDataList.length === 0) return;

	console.log(`[ORG: ${organizationId}] [INFO] [SINGLE_USE_CAMPAIGNS] Processing ${immediateProcessingDataList.length} immediate interactions`);
	const processingSummary = await processOrganizationInteractionsBatch({
		organizationId,
		interactions: immediateProcessingDataList,
		sendConcurrency: IMMEDIATE_PROCESSING_CONCURRENCY,
		weeklyLimitCache,
	});

	if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
		for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
			console.error(`[SINGLE_USE_CAMPAIGNS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
		}
	}

	console.log(`[ORG: ${organizationId}] [INFO] [SINGLE_USE_CAMPAIGNS] Immediate interactions processed`, {
		total: processingSummary.total,
		succeeded: processingSummary.sent + processingSummary.queued,
		failed: processingSummary.failed,
		claimed: processingSummary.claimed,
		blocked: processingSummary.blocked,
		durationMs: processingSummary.durationMs,
	});
}

async function getProcessSingleUseCampaignsRoute(_req: NextRequest) {
	console.log("[INFO] [SINGLE_USE_CAMPAIGNS] Starting single-use campaigns processing");

	try {
		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const currentDateAsISO8601 = nowInCronTimezone.format("YYYY-MM-DD");
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);

		console.log("[INFO] [SINGLE_USE_CAMPAIGNS] Current processing window", {
			timezone: INTERACTIONS_CRON_TIMEZONE,
			nowInTimezone: nowInCronTimezone.format(),
			currentDate: currentDateAsISO8601,
			currentTimeBlock,
		});

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		for (const organization of organizationsList) {
			const organizationSummary = createOrganizationSummary();

			console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Processing organization`);

			const singleUseCampaigns = await getSingleUseCampaignsForBlock({
				organizationId: organization.id,
				currentDate: currentDateAsISO8601,
				currentTimeBlock,
			});
			organizationSummary.activeCampaigns = singleUseCampaigns.length;

			if (singleUseCampaigns.length === 0) {
				console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] No active campaigns for this block`);
				console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Organization processing summary`, organizationSummary);
				continue;
			}

			for (const campaign of singleUseCampaigns) {
				await processSingleUseCampaign({
					organizationId: organization.id,
					campaign,
					currentDate: currentDateAsISO8601,
					currentTimeBlock,
					summary: organizationSummary,
				});
			}

			console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Organization processing summary`, organizationSummary);
		}

		console.log("[INFO] [SINGLE_USE_CAMPAIGNS] All organizations processed successfully");
		return NextResponse.json("EXECUTADO COM SUCESSO", { status: 200 });
	} catch (error) {
		console.error("[ERROR] [SINGLE_USE_CAMPAIGNS] Fatal error:", error);
		return NextResponse.json(
			{
				error: "Failed to process single-use campaigns",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getProcessSingleUseCampaignsRoute(req);
	},
});
