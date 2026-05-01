import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { DASTJS_TIME_DURATION_UNITS_MAP } from "@/lib/dates";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { type TCampaignEntity, type TInteractionEntity, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";
const IMMEDIATE_PROCESSING_CONCURRENCY = 5;

function getCurrentTimeBlock(currentTime: dayjs.Dayjs): (typeof TIME_BLOCKS)[number] {
	const currentHour = currentTime.hour();
	const currentMinute = currentTime.minute();
	const currentTotalMinutes = currentHour * 60 + currentMinute;

	const timeBlocksInMinutes = TIME_BLOCKS.map((block) => {
		const [hour, minute] = block.split(":").map(Number);
		return hour * 60 + minute;
	});

	let closestBlock = TIME_BLOCKS[0];
	for (let i = 0; i < timeBlocksInMinutes.length; i++) {
		if (timeBlocksInMinutes[i] <= currentTotalMinutes) {
			closestBlock = TIME_BLOCKS[i];
		} else {
			break;
		}
	}

	return closestBlock;
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

/**
 * Check if a campaign can be scheduled for a client based on frequency rules.
 */
async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	// Check for time interval (Frequency Cap)
	if (frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
		const cutoffDate = dayjs().subtract(frequenciaIntervaloValor, dayjsUnit).toDate();

		const recentInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq, gt }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId), gt(fields.dataInsercao, cutoffDate)),
		});

		if (recentInteraction) {
			return false;
		}
	}

	return true;
}

const handleProcessRecurrentCampaigns = async (_req: NextApiRequest, res: NextApiResponse) => {
	console.log("[INFO] [RECURRENT_CAMPAIGNS] Starting recurrent campaigns processing");

	try {
		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);
		const currentDateFormatted = nowInCronTimezone.format("YYYY-MM-DD");

		console.log(`[INFO] [RECURRENT_CAMPAIGNS] Current time block: ${currentTimeBlock}, date: ${currentDateFormatted}, timezone: ${INTERACTIONS_CRON_TIMEZONE}`);

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			await db.transaction(async (tx) => {
				// Find active RECORRENTE campaigns for this organization matching the current time block
				const recurrentCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(
							eq(fields.organizacaoId, organization.id),
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

				if (recurrentCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] No active RECORRENTE campaigns for time block ${currentTimeBlock}. Skipping.`);
					return;
				}

				// Filter campaigns that should run today based on their schedule
				const campaignsToRun = recurrentCampaigns.filter((campaign) => shouldCampaignRunToday(campaign, nowInCronTimezone));

				if (campaignsToRun.length === 0) {
					console.log(`[ORG: ${organization.id}] No RECORRENTE campaigns scheduled for today. Skipping.`);
					return;
				}

				console.log(`[ORG: ${organization.id}] ${campaignsToRun.length} recurrent campaign(s) to process.`);

				for (const campaign of campaignsToRun) {
					const targetClientIds = await resolveCampaignAudienceClientIdsForCampaign({
						executor: tx,
						organizationId: organization.id,
						campaign,
					});

					console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${targetClientIds.length} matching clients.`);

					for (const clientId of targetClientIds) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) continue;

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: organization.id,
								titulo: `Recorrente: ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: campaign.descricao ?? `Campanha recorrente: ${campaign.titulo}`,
								agendamentoDataReferencia: currentDateFormatted,
								agendamentoBlocoReferencia: currentTimeBlock as TInteractionEntity["agendamentoBlocoReferencia"],
							})
							.returning({ id: interactions.id });

						// Prepare for immediate processing
						if (campaign.whatsappTemplate && campaign.whatsappConexaoTelefone?.conexao && campaign.whatsappConexaoTelefoneId) {
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
										whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
										whatsappTemplate: campaign.whatsappTemplate,
									},
									whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
									whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
								});
							}
						}
					}
				}
			});

			// Process interactions immediately after transaction
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const processingSummary = await processOrganizationInteractionsBatch({
					organizationId: organization.id,
					interactions: immediateProcessingDataList,
					sendConcurrency: IMMEDIATE_PROCESSING_CONCURRENCY,
					weeklyLimitCache: createCampaignWeeklyLimitCache(),
				});

				if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
					for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
					}
				}

				console.log(`[ORG: ${organization.id}] [INFO] Finished immediate interactions processing`, {
					total: processingSummary.total,
					succeeded: processingSummary.sent + processingSummary.queued,
					failed: processingSummary.failed,
					durationMs: processingSummary.durationMs,
					claimed: processingSummary.claimed,
					blocked: processingSummary.blocked,
				});
			}
		}

		console.log("[INFO] [RECURRENT_CAMPAIGNS] All organizations processed successfully");
		return res.status(200).json("EXECUTADO COM SUCESSO");
	} catch (error) {
		console.error("[ERROR] [RECURRENT_CAMPAIGNS] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to process recurrent campaigns",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default handleProcessRecurrentCampaigns;
