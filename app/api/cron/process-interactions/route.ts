import { appApiHandler } from "@/lib/app-api";
import {
	INTERACTIONS_CRON_TIMEZONE,
	getArrivedTimeBlocksForDate,
	getCurrentTimeBlock,
	type TInteractionCronTimeBlock,
} from "@/lib/campaigns/time-blocks";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { processOrganizationInteractionsBatch } from "@/lib/interactions/process-organization-interactions";
import type { ImmediateProcessingData } from "@/lib/interactions/types";
import { db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const INTERACTIONS_PAGE_SIZE = 250;
const SEND_CONCURRENCY = 10;
const RUNTIME_BUDGET_MS = 295000;

type TOrganizationProcessingSummary = {
	pagesProcessed: number;
	interactionsRead: number;
	interactionsClaimed: number;
	interactionsBlocked: number;
	interactionsSent: number;
	interactionsQueued: number;
	interactionsFailed: number;
	interactionsSkippedAlreadyReserved: number;
	stoppedByTimeBudget: boolean;
};

type TProcessingSummary = TOrganizationProcessingSummary & {
	organizationsCount: number;
	processedOrganizationsCount: number;
	failedOrganizationsCount: number;
};

function createEmptyOrganizationSummary(): TOrganizationProcessingSummary {
	return {
		pagesProcessed: 0,
		interactionsRead: 0,
		interactionsClaimed: 0,
		interactionsBlocked: 0,
		interactionsSent: 0,
		interactionsQueued: 0,
		interactionsFailed: 0,
		interactionsSkippedAlreadyReserved: 0,
		stoppedByTimeBudget: false,
	};
}

function mergeOrganizationSummary(target: TProcessingSummary, source: TOrganizationProcessingSummary) {
	target.pagesProcessed += source.pagesProcessed;
	target.interactionsRead += source.interactionsRead;
	target.interactionsClaimed += source.interactionsClaimed;
	target.interactionsBlocked += source.interactionsBlocked;
	target.interactionsSent += source.interactionsSent;
	target.interactionsQueued += source.interactionsQueued;
	target.interactionsFailed += source.interactionsFailed;
	target.interactionsSkippedAlreadyReserved += source.interactionsSkippedAlreadyReserved;
	target.stoppedByTimeBudget = target.stoppedByTimeBudget || source.stoppedByTimeBudget;
}

function shouldContinueProcessing(startedAt: number) {
	return Date.now() - startedAt < RUNTIME_BUDGET_MS;
}

async function fetchPendingInteractionsPage({
	organizationId,
	currentDateAsISO8601,
	arrivedTimeBlocks,
	excludedInteractionIds,
}: {
	organizationId: string;
	currentDateAsISO8601: string;
	arrivedTimeBlocks: TInteractionCronTimeBlock[];
	excludedInteractionIds: Set<string>;
}) {
	const excludedIds = Array.from(excludedInteractionIds);

	return db.query.interactions.findMany({
		where: (fields, { and, eq, isNull, isNotNull }) => {
			const conditions = [
				eq(fields.organizacaoId, organizationId),
				eq(fields.agendamentoDataReferencia, currentDateAsISO8601),
				inArray(fields.agendamentoBlocoReferencia, arrivedTimeBlocks),
				isNotNull(fields.campanhaId),
				isNull(fields.dataExecucao),
				sql`${fields.statusEnvio} IS DISTINCT FROM 'BLOQUEADA'`,
				sql`${fields.statusEnvio} IS DISTINCT FROM 'FALHOU'`,
			];

			if (excludedIds.length > 0) {
				conditions.push(notInArray(fields.id, excludedIds));
			}

			return and(...conditions);
		},
		columns: {
			id: true,
			clienteId: true,
			campanhaId: true,
			dataInsercao: true,
			metadados: true,
		},
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
					telefone: true,
					email: true,
					analiseRFMTitulo: true,
					metadataProdutoMaisCompradoId: true,
					metadataGrupoProdutoMaisComprado: true,
				},
			},
			campanha: {
				columns: {
					id: true,
					whatsappConexaoTelefoneId: true,
				},
				with: {
					whatsappConexaoTelefone: {
						columns: {
							id: true,
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
			},
		},
		orderBy: (fields, { asc }) => [asc(fields.agendamentoBlocoReferencia), asc(fields.dataInsercao), asc(fields.id)],
		limit: INTERACTIONS_PAGE_SIZE,
	});
}

type TPendingInteraction = Awaited<ReturnType<typeof fetchPendingInteractionsPage>>[number];

async function fetchCampaignsForOrganization({ organizationId, campaignIds }: { organizationId: string; campaignIds: string[] }) {
	if (campaignIds.length === 0) return [];

	return db.query.campaigns.findMany({
		where: (fields, { and, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.id, campaignIds)),
		columns: {
			id: true,
			autorId: true,
		},
		with: {
			whatsappTemplate: true,
		},
	});
}

type TProcessingCampaign = Awaited<ReturnType<typeof fetchCampaignsForOrganization>>[number];

async function markInteractionsAsFailed({
	organizationId,
	interactionIds,
	errorMessage,
}: {
	organizationId: string;
	interactionIds: string[];
	errorMessage: string;
}) {
	if (interactionIds.length === 0) return;

	await db
		.update(interactions)
		.set({
			statusEnvio: "FALHOU",
			erroEnvio: errorMessage,
		})
		.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, interactionIds)));
}

function getCampaignConfigurationError(campaign: TProcessingCampaign, interaction: TPendingInteraction): string | null {
	if (!campaign.whatsappTemplate) {
		return "Campanha sem template de mensagem configurado.";
	}

	return null;
}

function buildImmediateProcessingData({
	organizationId,
	interaction,
	campaign,
}: {
	organizationId: string;
	interaction: TPendingInteraction;
	campaign: TProcessingCampaign;
}): ImmediateProcessingData {
	const whatsappConnection = interaction.campanha?.whatsappConexaoTelefone?.conexao;

	return {
		interactionId: interaction.id,
		organizationId,
		client: {
			id: interaction.cliente.id,
			nome: interaction.cliente.nome,
			telefone: interaction.cliente.telefone,
			email: interaction.cliente.email,
			analiseRFMTitulo: interaction.cliente.analiseRFMTitulo,
			metadataProdutoMaisCompradoId: interaction.cliente.metadataProdutoMaisCompradoId,
			metadataGrupoProdutoMaisComprado: interaction.cliente.metadataGrupoProdutoMaisComprado,
		},
		campaign: {
			autorId: campaign.autorId,
			whatsappConexaoTelefoneId: interaction.campanha?.whatsappConexaoTelefoneId ?? null,
			whatsappTemplate: campaign.whatsappTemplate,
		},
		whatsappToken: whatsappConnection?.tipoConexao === "META_CLOUD_API" ? (whatsappConnection.token ?? undefined) : undefined,
		whatsappSessionId: whatsappConnection?.tipoConexao === "INTERNAL_GATEWAY" ? (whatsappConnection.gatewaySessaoId ?? undefined) : undefined,
		contextMetadados: interaction.metadados ?? undefined,
	};
}

async function getProcessInteractionsRoute(_req: NextRequest) {
	const startedAt = Date.now();

	try {
		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const currentDateAsISO8601 = nowInCronTimezone.format("YYYY-MM-DD");
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);
		const arrivedTimeBlocks = getArrivedTimeBlocksForDate(currentTimeBlock);

		console.log("[INFO] [PROCESS_INTERACTIONS] Iniciando processamento de interacoes", {
			timezone: INTERACTIONS_CRON_TIMEZONE,
			nowInTimezone: nowInCronTimezone.format(),
			currentDate: currentDateAsISO8601,
			currentTimeBlock,
			arrivedTimeBlocks,
			pageSize: INTERACTIONS_PAGE_SIZE,
			sendConcurrency: SEND_CONCURRENCY,
			runtimeBudgetMs: RUNTIME_BUDGET_MS,
		});

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true, configuracao: true },
		});

		const overallSummary: TProcessingSummary = {
			organizationsCount: organizationsList.length,
			processedOrganizationsCount: 0,
			failedOrganizationsCount: 0,
			...createEmptyOrganizationSummary(),
		};

		for (const organization of organizationsList) {
			if (!shouldContinueProcessing(startedAt)) {
				overallSummary.stoppedByTimeBudget = true;
				break;
			}

			try {
				const organizationStartedAt = Date.now();
				const organizationSummary = createEmptyOrganizationSummary();
				const attemptedInteractionIds = new Set<string>();
				const weeklyLimitCache = createCampaignWeeklyLimitCache();
				const hasHubAccess = organization.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;

				console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Iniciando processamento da organizacao`);

				while (shouldContinueProcessing(startedAt)) {
					const pendingInteractionsPage = await fetchPendingInteractionsPage({
						organizationId: organization.id,
						currentDateAsISO8601,
						arrivedTimeBlocks,
						excludedInteractionIds: attemptedInteractionIds,
					});

					if (pendingInteractionsPage.length === 0) {
						break;
					}

					organizationSummary.pagesProcessed += 1;
					organizationSummary.interactionsRead += pendingInteractionsPage.length;

					const campaignIds = Array.from(
						new Set(pendingInteractionsPage.map((interaction) => interaction.campanhaId).filter((campaignId): campaignId is string => !!campaignId)),
					);
					const campaigns = await fetchCampaignsForOrganization({
						organizationId: organization.id,
						campaignIds,
					});
					const campaignsById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
					const interactionsReadyToProcess: ImmediateProcessingData[] = [];

					for (const interaction of pendingInteractionsPage) {
						attemptedInteractionIds.add(interaction.id);

						if (!interaction.campanhaId) {
							await markInteractionsAsFailed({
								organizationId: organization.id,
								interactionIds: [interaction.id],
								errorMessage: "Campanha nao encontrada para processar a interacao.",
							});
							organizationSummary.interactionsFailed += 1;
							continue;
						}

						const campaign = campaignsById.get(interaction.campanhaId);
						if (!campaign) {
							await markInteractionsAsFailed({
								organizationId: organization.id,
								interactionIds: [interaction.id],
								errorMessage: "Campanha nao encontrada para processar a interacao.",
							});
							organizationSummary.interactionsFailed += 1;
							continue;
						}

						const campaignConfigurationError = getCampaignConfigurationError(campaign, interaction);
						if (campaignConfigurationError) {
							await markInteractionsAsFailed({
								organizationId: organization.id,
								interactionIds: [interaction.id],
								errorMessage: campaignConfigurationError,
							});
							organizationSummary.interactionsFailed += 1;
							continue;
						}

						interactionsReadyToProcess.push(
							buildImmediateProcessingData({
								organizationId: organization.id,
								interaction,
								campaign,
							}),
						);
					}

					if (interactionsReadyToProcess.length === 0) {
						continue;
					}

					const batchResult = await processOrganizationInteractionsBatch({
						organizationId: organization.id,
						interactions: interactionsReadyToProcess,
						sendConcurrency: SEND_CONCURRENCY,
						weeklyLimitCache,
						hasHubAccess,
					});

					organizationSummary.interactionsClaimed += batchResult.claimed;
					organizationSummary.interactionsBlocked += batchResult.blocked;
					organizationSummary.interactionsSent += batchResult.sent;
					organizationSummary.interactionsQueued += batchResult.queued;
					organizationSummary.interactionsSkippedAlreadyReserved += batchResult.alreadyReserved;
					organizationSummary.interactionsFailed += batchResult.failed - batchResult.blocked - batchResult.alreadyReserved;

					console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Pagina processada`, {
						pageNumber: organizationSummary.pagesProcessed,
						interactionsRead: organizationSummary.interactionsRead,
						interactionsClaimed: organizationSummary.interactionsClaimed,
						interactionsBlocked: organizationSummary.interactionsBlocked,
						interactionsSent: organizationSummary.interactionsSent,
						interactionsQueued: organizationSummary.interactionsQueued,
						interactionsFailed: organizationSummary.interactionsFailed,
						interactionsSkippedAlreadyReserved: organizationSummary.interactionsSkippedAlreadyReserved,
					});
				}

				if (!shouldContinueProcessing(startedAt)) {
					organizationSummary.stoppedByTimeBudget = true;
				}

				overallSummary.processedOrganizationsCount += 1;
				mergeOrganizationSummary(overallSummary, organizationSummary);

				console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Organizacao processada`, {
					durationMs: Date.now() - organizationStartedAt,
					...organizationSummary,
				});

				if (organizationSummary.stoppedByTimeBudget) {
					break;
				}
			} catch (error) {
				overallSummary.failedOrganizationsCount += 1;
				console.error(`[ORG: ${organization.id}] [ERROR] [PROCESS_INTERACTIONS] Erro ao processar organizacao:`, error);
			}
		}

		console.log("[INFO] [PROCESS_INTERACTIONS] Processamento finalizado", overallSummary);

		return NextResponse.json(
			{
				message: overallSummary.stoppedByTimeBudget
					? "Interacoes processadas parcialmente devido ao limite de execucao."
					: "Interacoes processadas com sucesso.",
				data: overallSummary,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[ERROR] [PROCESS_INTERACTIONS] Erro fatal:", error);
		return NextResponse.json(
			{
				error: "Falha ao processar interacoes.",
				message: error instanceof Error ? error.message : "Erro desconhecido.",
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
		return getProcessInteractionsRoute(req);
	},
});
