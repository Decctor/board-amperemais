import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, clients, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, sql } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

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

const handleBirthdayNotify = async (req: NextApiRequest, res: NextApiResponse) => {
	console.log("[INFO] [BIRTHDAY_NOTIFY] Starting birthday notification cron job");

	try {
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		const today = dayjs();

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			await db.transaction(async (tx) => {
				// Get active campaigns for birthday notifications
				const birthdayCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "ANIVERSARIO_CLIENTE")),
					with: {
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

				if (birthdayCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] No active ANIVERSARIO_CLIENTE campaigns found. Skipping.`);
					return;
				}

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

					console.log(
						`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Direction: ${campaign.execucaoAgendadaDirecao}, ` +
							`Target birthday: ${targetMonth}/${targetDay}, Found ${birthdayClients.length} matching clients.`,
					);

					// Schedule notifications for each matching client
					for (const client of birthdayClients) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							client.id,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (canSchedule) {
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
								})
								.returning({ id: interactions.id });

							// Check for immediate processing (schedule date is today and value is 0, or ANTES direction)
							const isImmediate = isAntes || campaign.execucaoAgendadaValor === 0;
							if (isImmediate && campaign.whatsappTemplate && campaign.whatsappConexaoTelefone?.conexao && campaign.whatsappConexaoTelefoneId) {
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

							// Generate campaign cashback for ANIVERSARIO_CLIENTE trigger (FIXO only)
							if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
								await generateCashbackForCampaign({
									tx,
									organizationId: organization.id,
									clientId: client.id,
									campaignId: campaign.id,
									cashbackType: "FIXO",
									cashbackValue: campaign.cashbackGeracaoValor,
									saleId: null,
									saleValue: null,
									expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
									expirationValue: campaign.cashbackGeracaoExpiracaoValor,
								});
							}
						}
					}
				}
			});

			// Process interactions immediately after transaction (with delay to avoid rate limiting)
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const weeklyLimitCache = createCampaignWeeklyLimitCache();
				for (const processingData of immediateProcessingDataList) {
					processSingleInteractionImmediately({ ...processingData, weeklyLimitCache }).catch((err) =>
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${processingData.interactionId}:`, err),
					);
					await delay(100); // Small delay between sends to avoid rate limiting
				}
			}
		}

		console.log("[INFO] [BIRTHDAY_NOTIFY] All organizations processed successfully");
		return res.status(200).json("EXECUTADO COM SUCESSO");
	} catch (error) {
		console.error("[ERROR] [BIRTHDAY_NOTIFY] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to process birthday notifications",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default handleBirthdayNotify;
