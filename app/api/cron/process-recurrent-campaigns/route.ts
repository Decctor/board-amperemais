import { appApiHandler } from "@/lib/app-api";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { INTERACTIONS_CRON_TIMEZONE, getCurrentTimeBlock, type TInteractionCronTimeBlock } from "@/lib/campaigns/time-blocks";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { notifyCampaignEnqueueFailure } from "@/lib/cron/notify-campaign-enqueue-failure";
import { DASTJS_TIME_DURATION_UNITS_MAP } from "@/lib/dates";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { type TCampaignWeeklyLimitCache, createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { type TCampaignEntity, type TInteractionEntity, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gt, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const IMMEDIATE_PROCESSING_CONCURRENCY = 5;
// Insertions are chunked so each transaction stays short and stays under Postgres'
// 65535 bind-parameter limit (interactions: ~8 columns per row).
const ENQUEUE_CHUNK_SIZE = 1000;
const MAX_ENQUEUE_ATTEMPTS = 3;
const ENQUEUE_RETRY_BASE_DELAY_MS = 250;

type TRecurrentCampaign = Awaited<ReturnType<typeof getRecurrentCampaignsForBlock>>[number];

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

/**
 * Checks if a recurrent campaign should run today based on its schedule configuration.
 */
function shouldCampaignRunToday(
	campaign: {
		recorrenciaTipo: string | null;
		recorrenciaIntervalo: number | null;
		recorrenciaDiasSemana: string | null;
		recorrenciaDiasMes: string | null;
		dataInsercao: Date;
	},
	today: dayjs.Dayjs,
): boolean {
	const campaignStart = dayjs(campaign.dataInsercao).tz(INTERACTIONS_CRON_TIMEZONE);
	const interval = campaign.recorrenciaIntervalo || 1;

	switch (campaign.recorrenciaTipo) {
		case "DIARIO": {
			const daysDiff = today.startOf("day").diff(campaignStart.startOf("day"), "day");
			return daysDiff >= 0 && daysDiff % interval === 0;
		}
		case "SEMANAL": {
			const diasSemana: number[] = JSON.parse(campaign.recorrenciaDiasSemana || "[]");
			if (!diasSemana.includes(today.day())) return false;
			const weeksDiff = today.startOf("week").diff(campaignStart.startOf("week"), "week");
			return weeksDiff >= 0 && weeksDiff % interval === 0;
		}
		case "MENSAL": {
			const diasMes: number[] = JSON.parse(campaign.recorrenciaDiasMes || "[]");
			if (!diasMes.includes(today.date())) return false;
			const monthsDiff = today.startOf("month").diff(campaignStart.startOf("month"), "month");
			return monthsDiff >= 0 && monthsDiff % interval === 0;
		}
		default:
			return false;
	}
}

async function getRecurrentCampaignsForBlock({
	organizationId,
	currentTimeBlock,
}: {
	organizationId: string;
	currentTimeBlock: TInteractionCronTimeBlock;
}) {
	return db.query.campaigns.findMany({
		where: (fields, { and, eq }) =>
			and(
				eq(fields.organizacaoId, organizationId),
				eq(fields.ativo, true),
				eq(fields.gatilhoTipo, "RECORRENTE"),
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

// Inserts a chunk of interactions in a single short transaction. The campaign frequency cap is
// enforced set-based for the whole chunk. On retries, clients already enqueued in this block are
// skipped so a previous attempt whose COMMIT acknowledgement was lost does not create duplicates.
async function enqueueRecurrentCampaignChunk({
	organizationId,
	campaign,
	clientIds,
	currentDate,
	currentTimeBlock,
}: {
	organizationId: string;
	campaign: TRecurrentCampaign;
	clientIds: string[];
	currentDate: string;
	currentTimeBlock: TInteractionCronTimeBlock;
}): Promise<{ inserted: { id: string; clienteId: string }[] }> {
	return db.transaction(async (tx) => {
		let eligibleClientIds = clientIds;

		// Frequency cap: exclude clients that already received an interaction from this campaign
		// within the configured interval.
		if (campaign.frequenciaIntervaloValor && campaign.frequenciaIntervaloValor > 0 && campaign.frequenciaIntervaloMedida) {
			const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[campaign.frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
			const cutoffDate = dayjs().subtract(campaign.frequenciaIntervaloValor, dayjsUnit).toDate();
			const recent = await tx
				.select({ clienteId: interactions.clienteId })
				.from(interactions)
				.where(
					and(eq(interactions.campanhaId, campaign.id), inArray(interactions.clienteId, eligibleClientIds), gt(interactions.dataInsercao, cutoffDate)),
				);
			const recentClientIds = new Set(recent.map((row) => row.clienteId));
			eligibleClientIds = eligibleClientIds.filter((clientId) => !recentClientIds.has(clientId));
		}

		if (eligibleClientIds.length > 0) {
			const existing = await tx
				.select({ clienteId: interactions.clienteId })
				.from(interactions)
				.where(
					and(
						eq(interactions.organizacaoId, organizationId),
						eq(interactions.campanhaId, campaign.id),
						inArray(interactions.clienteId, eligibleClientIds),
						eq(interactions.agendamentoDataReferencia, currentDate),
						eq(interactions.agendamentoBlocoReferencia, currentTimeBlock as NonNullable<TInteractionEntity["agendamentoBlocoReferencia"]>),
					),
				);
			const existingClientIds = new Set(existing.map((row) => row.clienteId));
			eligibleClientIds = eligibleClientIds.filter((clientId) => !existingClientIds.has(clientId));
		}

		if (eligibleClientIds.length === 0) {
			return { inserted: [] };
		}

		const inserted = await tx
			.insert(interactions)
			.values(
				eligibleClientIds.map((clientId) => ({
					clienteId: clientId,
					campanhaId: campaign.id,
					organizacaoId: organizationId,
					titulo: `Recorrente: ${campaign.titulo}`,
					tipo: "ENVIO-MENSAGEM" as const,
					descricao: campaign.descricao ?? `Campanha recorrente: ${campaign.titulo}`,
					agendamentoDataReferencia: currentDate,
					agendamentoBlocoReferencia: currentTimeBlock as TInteractionEntity["agendamentoBlocoReferencia"],
				})),
			)
			.returning({ id: interactions.id, clienteId: interactions.clienteId });

		return { inserted };
	});
}

async function processChunkImmediateInteractions({
	organizationId,
	campaign,
	inserted,
	weeklyLimitCache,
}: {
	organizationId: string;
	campaign: TRecurrentCampaign;
	inserted: { id: string; clienteId: string }[];
	weeklyLimitCache: TCampaignWeeklyLimitCache;
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
			metadataProdutoSugeridoId: true,
		},
	});
	const clientDataById = new Map(clientsData.map((client) => [client.id, client]));

	const immediateProcessingDataList: ImmediateProcessingData[] = [];
	for (const row of inserted) {
		const clientData = clientDataById.get(row.clienteId);
		if (!clientData) continue;

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
				metadataProdutoSugeridoId: clientData.metadataProdutoSugeridoId,
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

	console.log(`[ORG: ${organizationId}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
	const processingSummary = await processOrganizationInteractionsBatch({
		organizationId,
		interactions: immediateProcessingDataList,
		sendConcurrency: IMMEDIATE_PROCESSING_CONCURRENCY,
		weeklyLimitCache,
	});

	if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
		for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
			console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
		}
	}

	console.log(`[ORG: ${organizationId}] [INFO] Finished immediate interactions processing`, {
		total: processingSummary.total,
		succeeded: processingSummary.sent + processingSummary.queued,
		failed: processingSummary.failed,
		durationMs: processingSummary.durationMs,
		claimed: processingSummary.claimed,
		blocked: processingSummary.blocked,
	});
}

async function processRecurrentCampaign({
	organizationId,
	campaign,
	currentDate,
	currentTimeBlock,
	weeklyLimitCache,
}: {
	organizationId: string;
	campaign: TRecurrentCampaign;
	currentDate: string;
	currentTimeBlock: TInteractionCronTimeBlock;
	weeklyLimitCache: TCampaignWeeklyLimitCache;
}) {
	const targetClientIds = await resolveCampaignAudienceClientIdsForCampaign({
		executor: db,
		organizationId,
		campaign,
	});

	console.log(`[ORG: ${organizationId}] [CAMPAIGN: ${campaign.id}] Found ${targetClientIds.length} matching clients.`);

	if (targetClientIds.length === 0) return;

	const hasDeliveryConfig = !!campaign.whatsappTemplate;

	let campaignEnqueuedCount = 0;
	const failedClientIds: string[] = [];
	const enqueueErrors: string[] = [];

	const chunks = chunkArray(targetClientIds, ENQUEUE_CHUNK_SIZE);
	for (const chunk of chunks) {
		let inserted: { id: string; clienteId: string }[] | null = null;
		let lastError: unknown = null;

		for (let attempt = 1; attempt <= MAX_ENQUEUE_ATTEMPTS; attempt += 1) {
			try {
				const result = await enqueueRecurrentCampaignChunk({
					organizationId,
					campaign,
					clientIds: chunk,
					currentDate,
					currentTimeBlock,
				});
				inserted = result.inserted;
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

		campaignEnqueuedCount += inserted.length;

		if (hasDeliveryConfig && inserted.length > 0) {
			await processChunkImmediateInteractions({ organizationId, campaign, inserted, weeklyLimitCache });
		}
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
			notes: ["A campanha continua ativa; os clientes não enfileirados poderão ser processados na próxima recorrência."],
		});
	}
}

async function getProcessRecurrentCampaignsRoute(_req: NextRequest) {
	console.log("[INFO] [RECURRENT_CAMPAIGNS] Starting recurrent campaigns processing");

	try {
		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);
		const currentDateFormatted = nowInCronTimezone.format("YYYY-MM-DD");

		console.log(
			`[INFO] [RECURRENT_CAMPAIGNS] Current time block: ${currentTimeBlock}, date: ${currentDateFormatted}, timezone: ${INTERACTIONS_CRON_TIMEZONE}`,
		);

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			const recurrentCampaigns = await getRecurrentCampaignsForBlock({
				organizationId: organization.id,
				currentTimeBlock,
			});

			if (recurrentCampaigns.length === 0) {
				console.log(`[ORG: ${organization.id}] No active RECORRENTE campaigns for time block ${currentTimeBlock}. Skipping.`);
				continue;
			}

			const campaignsToRun = recurrentCampaigns.filter((campaign) => shouldCampaignRunToday(campaign, nowInCronTimezone));

			if (campaignsToRun.length === 0) {
				console.log(`[ORG: ${organization.id}] No RECORRENTE campaigns scheduled for today. Skipping.`);
				continue;
			}

			console.log(`[ORG: ${organization.id}] ${campaignsToRun.length} recurrent campaign(s) to process.`);

			const weeklyLimitCache = createCampaignWeeklyLimitCache();
			for (const campaign of campaignsToRun) {
				await processRecurrentCampaign({
					organizationId: organization.id,
					campaign,
					currentDate: currentDateFormatted,
					currentTimeBlock,
					weeklyLimitCache,
				});
			}
		}

		console.log("[INFO] [RECURRENT_CAMPAIGNS] All organizations processed successfully");
		return NextResponse.json("EXECUTADO COM SUCESSO", { status: 200 });
	} catch (error) {
		console.error("[ERROR] [RECURRENT_CAMPAIGNS] Fatal error:", error);
		return NextResponse.json(
			{
				error: "Failed to process recurrent campaigns",
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
		return getProcessRecurrentCampaignsRoute(req);
	},
});
