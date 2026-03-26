import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, clients, interactions, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, inArray, sql, sum, count } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

const LOOKBACK_WEEKS = 8;

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
	if (!permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId)),
		});
		if (previousInteraction) {
			return false;
		}
	}

	if (permitirRecorrencia && frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
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

/**
 * Compute the worst (lowest revenue) day-of-week for an organization
 * based on the last LOOKBACK_WEEKS of sales data.
 * Days with zero sales are excluded (e.g., closed days).
 * Returns the day-of-week number (0=Sunday, 6=Saturday) or null if insufficient data.
 */
async function computeWorstSalesDayOfWeek(tx: DBTransaction, organizationId: string): Promise<number | null> {
	const lookbackDate = dayjs().subtract(LOOKBACK_WEEKS, "week").toDate();

	const salesByDayOfWeek = await tx
		.select({
			dayOfWeek: sql<number>`EXTRACT(DOW FROM ${sales.dataVenda})::int`,
			totalValue: sum(sales.valorTotal),
		})
		.from(sales)
		.where(and(eq(sales.organizacaoId, organizationId), gte(sales.dataVenda, lookbackDate)))
		.groupBy(sql`EXTRACT(DOW FROM ${sales.dataVenda})::int`);

	// Need at least 2 distinct sale days to have a meaningful "worst"
	if (salesByDayOfWeek.length < 2) return null;

	// Sort by total value ascending, then by day-of-week ascending for tie-breaking
	const sorted = salesByDayOfWeek.sort(
		(a, b) => Number(a.totalValue ?? 0) - Number(b.totalValue ?? 0) || a.dayOfWeek - b.dayOfWeek,
	);

	return sorted[0].dayOfWeek;
}

const handleWorstSalesDayNotify = async (req: NextApiRequest, res: NextApiResponse) => {
	console.log("[INFO] [WORST_SALES_DAY_NOTIFY] Starting worst sales day notification cron job");

	try {
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		const today = dayjs();

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			// Query whatsappConnection for immediate processing
			const whatsappConnection = await db.query.whatsappConnections.findFirst({
				where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
			});

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			await db.transaction(async (tx) => {
				// Find active PIOR-DIA-VENDAS campaigns for this org
				const worstDayCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "PIOR-DIA-VENDAS")),
					with: {
						segmentacoes: true,
						whatsappTemplate: true,
					},
				});

				if (worstDayCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] No active PIOR-DIA-VENDAS campaigns found. Skipping.`);
					return;
				}

				// Compute worst day-of-week from recent sales (one query per org)
				const worstDayOfWeek = await computeWorstSalesDayOfWeek(tx, organization.id);
				if (worstDayOfWeek === null) {
					console.log(`[ORG: ${organization.id}] Insufficient sales data to determine worst day. Skipping.`);
					return;
				}

				console.log(`[ORG: ${organization.id}] Worst sales day of week: ${worstDayOfWeek} (0=Sun, 6=Sat)`);

				for (const campaign of worstDayCampaigns) {
					let targetDayOfWeek: number;
					let scheduleDate: string;
					const isAntes = campaign.execucaoAgendadaDirecao === "ANTES" && campaign.execucaoAgendadaValor > 0;

					if (isAntes) {
						// Look ahead: is the worst day N units from now?
						const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[campaign.execucaoAgendadaMedida];
						const futureDate = today.add(campaign.execucaoAgendadaValor, dayjsUnit);
						targetDayOfWeek = futureDate.day(); // 0=Sunday
						scheduleDate = today.format("YYYY-MM-DD"); // send today
					} else {
						// Is today the worst day? Schedule with delay.
						targetDayOfWeek = today.day();
						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: today.toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});
						scheduleDate = dayjs(interactionScheduleDate).format("YYYY-MM-DD");
					}

					if (targetDayOfWeek !== worstDayOfWeek) {
						console.log(
							`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Target DOW ${targetDayOfWeek} !== worst DOW ${worstDayOfWeek}. Skipping.`,
						);
						continue;
					}

					console.log(
						`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Direction: ${campaign.execucaoAgendadaDirecao}, ` +
							`Target DOW matches worst day (${worstDayOfWeek}). Scheduling interactions.`,
					);

					// Find target clients (filtered by campaign segmentations, like recurrent campaigns)
					const segmentationValues = campaign.segmentacoes.map((s) => s.segmentacao);

					let targetClients: { id: string; nome: string | null }[];
					if (segmentationValues.length > 0) {
						targetClients = await tx
							.select({ id: clients.id, nome: clients.nome })
							.from(clients)
							.where(and(eq(clients.organizacaoId, organization.id), inArray(clients.analiseRFMTitulo, segmentationValues)));
					} else {
						targetClients = await tx
							.select({ id: clients.id, nome: clients.nome })
							.from(clients)
							.where(eq(clients.organizacaoId, organization.id));
					}

					console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${targetClients.length} matching clients.`);

					for (const client of targetClients) {
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
									titulo: `Pior dia de vendas: ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Campanha para o pior dia de vendas da semana.`,
									agendamentoDataReferencia: scheduleDate,
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								})
								.returning({ id: interactions.id });

							// Check for immediate processing
							const isImmediate = isAntes || campaign.execucaoAgendadaValor === 0;
							if (isImmediate && campaign.whatsappTemplate && whatsappConnection && campaign.whatsappConexaoTelefoneId) {
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
										whatsappToken: whatsappConnection.token ?? undefined,
										whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
									});
								}
							}

							// Generate campaign cashback (FIXO only, no sale context)
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

			// Process interactions immediately after transaction
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const weeklyLimitCache = createCampaignWeeklyLimitCache();
				for (const processingData of immediateProcessingDataList) {
					processSingleInteractionImmediately({ ...processingData, weeklyLimitCache }).catch((err) =>
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${processingData.interactionId}:`, err),
					);
					await delay(100);
				}
			}
		}

		console.log("[INFO] [WORST_SALES_DAY_NOTIFY] All organizations processed successfully");
		return res.status(200).json("EXECUTADO COM SUCESSO");
	} catch (error) {
		console.error("[ERROR] [WORST_SALES_DAY_NOTIFY] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to process worst sales day notifications",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default handleWorstSalesDayNotify;
