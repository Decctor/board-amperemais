import { appApiHandler } from "@/lib/app-api";
import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import { db } from "@/services/drizzle";
import { campaigns, interactions } from "@/services/drizzle/schema";
import type { TCampaignEntity, TInteractionEntity } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"] as const;
const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";
const IMMEDIATE_PROCESSING_CONCURRENCY = 5;

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
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Processing organization`);

			await db.transaction(async (tx) => {
				const singleUseCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(
							eq(fields.organizacaoId, organization.id),
							eq(fields.ativo, true),
							eq(fields.gatilhoTipo, "USO-UNICO"),
							eq(fields.gatilhoUsoUnicoDataReferencia, currentDateAsISO8601),
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
				organizationSummary.activeCampaigns = singleUseCampaigns.length;

				if (singleUseCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] No active campaigns for this block`);
					return;
				}

				for (const campaign of singleUseCampaigns) {
					const [claimedCampaign] = await tx
						.update(campaigns)
						.set({ ativo: false })
						.where(and(eq(campaigns.id, campaign.id), eq(campaigns.organizacaoId, organization.id), eq(campaigns.ativo, true)))
						.returning({ id: campaigns.id });

					if (!claimedCampaign) {
						console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Campaign was already claimed. Skipping.`);
						continue;
					}

					organizationSummary.claimedCampaigns += 1;

					const targetClientIds = await resolveCampaignAudienceClientIdsForCampaign({
						executor: tx,
						organizationId: organization.id,
						campaign,
					});
					organizationSummary.targetClients += targetClientIds.length;

					console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${targetClientIds.length} matching clients.`);

					const hasDeliveryConfig = !!(campaign.whatsappTemplate && campaign.whatsappConexaoTelefone?.conexao && campaign.whatsappConexaoTelefoneId);

					for (const clientId of targetClientIds) {
						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: organization.id,
								titulo: `Uso único: ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: campaign.descricao ?? `Campanha de uso único: ${campaign.titulo}`,
								agendamentoDataReferencia: currentDateAsISO8601,
								agendamentoBlocoReferencia: currentTimeBlock as TInteractionEntity["agendamentoBlocoReferencia"],
							})
							.returning({ id: interactions.id });
						organizationSummary.interactionsInserted += 1;

						if (hasDeliveryConfig) {
							const clientData = await tx.query.clients.findFirst({
								where: (fields, { eq }) => eq(fields.id, clientId),
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

							if (clientData) {
								organizationSummary.interactionsQueuedForImmediateProcessing += 1;
								immediateProcessingDataList.push({
									interactionId: insertedInteraction.id,
									organizationId: organization.id,
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
										whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId as string,
										whatsappTemplate: campaign.whatsappTemplate,
									},
									whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
									whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
								});
							} else {
								organizationSummary.immediateEligibleWithoutClientData += 1;
							}
						} else {
							organizationSummary.immediateEligibleWithoutDeliveryConfig += 1;
						}

						if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
							await generateCashbackForCampaign({
								tx,
								organizationId: organization.id,
								clientId,
								campaignId: campaign.id,
								cashbackType: "FIXO",
								cashbackValue: campaign.cashbackGeracaoValor,
								saleId: null,
								saleValue: null,
								expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
								expirationValue: campaign.cashbackGeracaoExpiracaoValor,
							});
							organizationSummary.cashbacksGenerated += 1;
						}
					}
				}
			});

			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const processingSummary = await processOrganizationInteractionsBatch({
					organizationId: organization.id,
					interactions: immediateProcessingDataList,
					sendConcurrency: IMMEDIATE_PROCESSING_CONCURRENCY,
					weeklyLimitCache: createCampaignWeeklyLimitCache(),
				});

				if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
					for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
						console.error(`[SINGLE_USE_CAMPAIGNS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
					}
				}

				console.log(`[ORG: ${organization.id}] [INFO] [SINGLE_USE_CAMPAIGNS] Immediate interactions processed`, {
					total: processingSummary.total,
					succeeded: processingSummary.sent + processingSummary.queued,
					failed: processingSummary.failed,
					claimed: processingSummary.claimed,
					blocked: processingSummary.blocked,
					durationMs: processingSummary.durationMs,
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
