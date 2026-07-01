import { appApiHandler } from "@/lib/app-api";
import { applyCampaignBonusToInteractionMetadata, buildBaseCashbackInteractionMetadata } from "@/lib/campaigns/interaction-metadata";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import {
	INTERACTIONS_CRON_TIMEZONE,
	getCurrentTimeBlock,
	scheduledBlockHasArrived,
	type TInteractionCronTimeBlock,
} from "@/lib/campaigns/time-blocks";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { clients, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type TOrganizationBirthdayNotifySummary = {
	activeCampaigns: number;
	matchingClients: number;
	interactionsInserted: number;
	interactionsQueuedForImmediateProcessing: number;
	interactionsScheduledForProcessInteractions: number;
	skippedByFrequencyRules: number;
	immediateEligibleWithoutDeliveryConfig: number;
	immediateEligibleWithoutClientData: number;
	cashbacksGenerated: number;
};

/**
 * Helper function to check if a campaign can be scheduled for a client based on frequency rules
 */
async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	permitirRecorrencia: boolean,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	// Check if campaign allows recurrence
	if (!permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId)),
		});
		if (previousInteraction) {
			return false;
		}
	}

	// Check for time interval (Frequency Cap)
	if (permitirRecorrencia && frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		// Map the enum to dayjs units
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";

		// Calculate the cutoff date based on the campaign's interval settings
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

async function getBirthdayNotifyRoute(_req: NextRequest) {
	console.log("[INFO] [BIRTHDAY_NOTIFY] Starting birthday notification cron job");

	try {
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const today = nowInCronTimezone;
		const currentDateAsISO8601 = nowInCronTimezone.format("YYYY-MM-DD");
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];
			const organizationSummary: TOrganizationBirthdayNotifySummary = {
				activeCampaigns: 0,
				matchingClients: 0,
				interactionsInserted: 0,
				interactionsQueuedForImmediateProcessing: 0,
				interactionsScheduledForProcessInteractions: 0,
				skippedByFrequencyRules: 0,
				immediateEligibleWithoutDeliveryConfig: 0,
				immediateEligibleWithoutClientData: 0,
				cashbacksGenerated: 0,
			};

			await db.transaction(async (tx) => {
				// Get active campaigns for birthday notifications
				const birthdayCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "ANIVERSARIO_CLIENTE")),
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
				organizationSummary.activeCampaigns = birthdayCampaigns.length;

				if (birthdayCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] No active ANIVERSARIO_CLIENTE campaigns found. Skipping.`);
					return;
				}

				const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: { terminologia: true },
				});
				const cashbackTerminology = cashbackProgram?.terminologia ?? "DINHEIRO";
				const runningBalanceByClientId = new Map<string, { available: number; accumulated: number }>();

				// Process each campaign individually (each may target a different birthday date based on direction)
				for (const campaign of birthdayCampaigns) {
					let targetMonth: number;
					let targetDay: number;
					let scheduleDate: string;
					const isAntes = campaign.execucaoAgendadaDirecao === "ANTES" && campaign.execucaoAgendadaValor > 0;

					if (isAntes) {
						// Look ahead: find clients whose birthday is N days/weeks/months from now
						const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[campaign.execucaoAgendadaMedida];
						const futureDate = today.add(campaign.execucaoAgendadaValor, dayjsUnit);
						targetMonth = futureDate.month() + 1;
						targetDay = futureDate.date();
						// Schedule for today (send the message now, before the birthday)
						scheduleDate = today.format("YYYY-MM-DD");
					} else {
						// Current behavior: birthday is today, delay execution by N days
						targetMonth = today.month() + 1;
						targetDay = today.date();
						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: today.toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});
						scheduleDate = dayjs(interactionScheduleDate).format("YYYY-MM-DD");
					}

					// Find clients whose birthday matches the target date (month and day)
					const audienceClientIds = new Set(
						await resolveCampaignAudienceClientIdsForCampaign({
							executor: tx,
							organizationId: organization.id,
							campaign,
						}),
					);
					const birthdayClients = await tx
						.select({
							id: clients.id,
							nome: clients.nome,
						})
						.from(clients)
						.where(
							and(
								eq(clients.organizacaoId, organization.id),
								sql`EXTRACT(MONTH FROM ${clients.dataNascimento}) = ${targetMonth}`,
								sql`EXTRACT(DAY FROM ${clients.dataNascimento}) = ${targetDay}`,
							),
						);
					const targetBirthdayClients = birthdayClients.filter((client) => audienceClientIds.has(client.id));

					console.log(
						`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Direction: ${campaign.execucaoAgendadaDirecao}, ` +
							`Target birthday: ${targetMonth}/${targetDay}, Found ${targetBirthdayClients.length} matching clients.`,
					);
					organizationSummary.matchingClients += targetBirthdayClients.length;

					const birthdayClientIds = targetBirthdayClients.map((client) => client.id);
					const clientBalances =
						birthdayClientIds.length > 0
							? await tx.query.cashbackProgramBalances.findMany({
									where: (fields, { and, eq, inArray }) =>
										and(eq(fields.organizacaoId, organization.id), inArray(fields.clienteId, birthdayClientIds)),
									columns: {
										clienteId: true,
										saldoValorDisponivel: true,
										saldoValorAcumuladoTotal: true,
										saldoValorResgatadoTotal: true,
									},
								})
							: [];
					const clientBalanceMap = new Map(clientBalances.map((balance) => [balance.clienteId, balance]));

					// Schedule notifications for each matching client
					for (const client of targetBirthdayClients) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							client.id,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (canSchedule) {
							const clientBalance = clientBalanceMap.get(client.id);
							const running = runningBalanceByClientId.get(client.id) ?? {
								available: clientBalance?.saldoValorDisponivel ?? 0,
								accumulated: clientBalance?.saldoValorAcumuladoTotal ?? 0,
							};
							const bonusResult = await applyCampaignBonusToInteractionMetadata({
								tx,
								baseMetadata: buildBaseCashbackInteractionMetadata({
									terminologia: cashbackTerminology,
									availableBalance: running.available,
									accumulatedTotal: running.accumulated,
									redeemedTotal: clientBalance?.saldoValorResgatadoTotal ?? 0,
								}),
								campaign,
								organizationId: organization.id,
								clientId: client.id,
								saleId: null,
								saleValue: null,
								enabled: campaign.cashbackGeracaoTipo === "FIXO",
							});
							runningBalanceByClientId.set(client.id, {
								available: bonusResult.runningAvailableBalance,
								accumulated: bonusResult.runningAccumulatedTotal,
							});
							const interactionContextMetadados = bonusResult.metadata;
							if (bonusResult.bonusAmount !== null) {
								organizationSummary.cashbacksGenerated += 1;
							}

							organizationSummary.interactionsInserted += 1;
							const [insertedInteraction] = await tx
								.insert(interactions)
								.values({
									clienteId: client.id,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Aniversário: ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Feliz aniversário, ${client.nome}!`,
									agendamentoDataReferencia: scheduleDate,
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
									metadados: interactionContextMetadados,
								})
								.returning({ id: interactions.id });

							// Process immediately only when today's scheduled block has already arrived.
							const scheduleIsToday = scheduleDate === currentDateAsISO8601;
							const isImmediateCandidate = isAntes || campaign.execucaoAgendadaValor === 0;
							const scheduledBlockArrived = scheduledBlockHasArrived(campaign.execucaoAgendadaBloco as TInteractionCronTimeBlock, currentTimeBlock);
							const isImmediate = isImmediateCandidate && scheduleIsToday && scheduledBlockArrived;
							const hasDeliveryConfig = !!campaign.whatsappTemplate;

							if (isImmediate && hasDeliveryConfig) {
								// Query client data for immediate processing
								const clientData = await tx.query.clients.findFirst({
									where: (fields, { eq }) => eq(fields.id, client.id),
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
											metadataProdutoSugeridoId: clientData.metadataProdutoSugeridoId,
										},
										campaign: {
											autorId: campaign.autorId,
											whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
											whatsappTemplate: campaign.whatsappTemplate,
										},
										whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
										whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
										contextMetadados: interactionContextMetadados,
									});
								} else {
									organizationSummary.immediateEligibleWithoutClientData += 1;
								}
							} else if (isImmediate) {
								organizationSummary.immediateEligibleWithoutDeliveryConfig += 1;
							} else {
								organizationSummary.interactionsScheduledForProcessInteractions += 1;
							}

						} else {
							organizationSummary.skippedByFrequencyRules += 1;
						}
					}
				}
			});

			// Process interactions immediately after transaction (with delay to avoid rate limiting)
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const processingSummary = await processOrganizationInteractionsBatch({
					organizationId: organization.id,
					interactions: immediateProcessingDataList,
					weeklyLimitCache: createCampaignWeeklyLimitCache(),
				});
				if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
					for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
					}
				}
			}

			console.log(`[ORG: ${organization.id}] [INFO] [BIRTHDAY_NOTIFY] Organization processing summary`, {
				...organizationSummary,
				timezone: INTERACTIONS_CRON_TIMEZONE,
				currentDate: currentDateAsISO8601,
				currentTimeBlock,
			});
		}

		console.log("[INFO] [BIRTHDAY_NOTIFY] All organizations processed successfully");
		return NextResponse.json("EXECUTADO COM SUCESSO", { status: 200 });
	} catch (error) {
		console.error("[ERROR] [BIRTHDAY_NOTIFY] Fatal error:", error);
		return NextResponse.json(
			{
				error: "Failed to process birthday notifications",
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
		return getBirthdayNotifyRoute(req);
	},
});
