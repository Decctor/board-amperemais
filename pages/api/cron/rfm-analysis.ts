import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPeriodAmountFromReferenceUnit, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { clients, interactions, sales, utils } from "@/services/drizzle/schema";
import { getRFMLabel } from "@/utils/rfm";
import { and, eq, gte, lte, sql } from "drizzle-orm";

const intervalStart = dayjs().subtract(12, "month").startOf("day").toDate();
const intervalEnd = dayjs().endOf("day").toDate();
const RFM_UPDATE_BATCH_SIZE = 100;

type TRFMClientUpdateEntry = {
	clientId: string;
	analiseRFMTitulo: string;
	analiseRFMNotasFrequencia: string;
	analiseRFMNotasRecencia: string;
	analiseRFMNotasMonetario: string;
	analiseRFMUltimaAtualizacao: Date;
	analiseRFMUltimaAlteracao: Date | null;
};

/**
 * Helper function to check if a campaign can be scheduled for a client based on frequency rules
 * @param tx - Database transaction instance
 * @param clienteId - Client ID
 * @param campanhaId - Campaign ID
 * @param permitirRecorrencia - Whether the campaign allows recurrence
 * @param frequenciaIntervaloValor - Frequency interval value
 * @param frequenciaIntervaloMedida - Frequency interval unit (DIAS, HORAS, etc.)
 * @returns true if the campaign can be scheduled, false otherwise
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
			console.log(`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} does not allow recurrence. Skipping for client ${clienteId}.`);
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
			console.log(
				`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} frequency limit reached for client ${clienteId}. Last interaction was at ${recentInteraction.dataInsercao}.`,
			);
			return false;
		}
	}

	return true;
}

async function flushPendingRFMClientUpdates({
	tx,
	organizationId,
	pendingUpdates,
}: {
	tx: DBTransaction;
	organizationId: string;
	pendingUpdates: TRFMClientUpdateEntry[];
}) {
	if (pendingUpdates.length === 0) return { updatedClientsCount: 0, durationMs: 0 };
	const startedAt = Date.now();

	await tx.execute(sql`
		update ${clients} as c
		set
			analise_rfm_titulo = v.analise_rfm_titulo::text,
			analise_rfm_notas_frequencia = v.analise_rfm_notas_frequencia::text,
			analise_rfm_notas_recencia = v.analise_rfm_notas_recencia::text,
			analise_rfm_notas_monetario = v.analise_rfm_notas_monetario::text,
			analise_rfm_ultima_atualizacao = v.analise_rfm_ultima_atualizacao::timestamp,
			analise_rfm_ultima_alteracao = v.analise_rfm_ultima_alteracao::timestamp
		from (
			values
				${sql.join(
					pendingUpdates.map(
						(entry) => sql`(
							${entry.clientId},
							${organizationId},
							${entry.analiseRFMTitulo},
							${entry.analiseRFMNotasFrequencia},
							${entry.analiseRFMNotasRecencia},
							${entry.analiseRFMNotasMonetario},
							${entry.analiseRFMUltimaAtualizacao.toISOString()},
							${entry.analiseRFMUltimaAlteracao?.toISOString() ?? null}
						)`,
					),
					sql`, `,
				)}
		) as v(
			client_id,
			organization_id,
			analise_rfm_titulo,
			analise_rfm_notas_frequencia,
			analise_rfm_notas_recencia,
			analise_rfm_notas_monetario,
			analise_rfm_ultima_atualizacao,
			analise_rfm_ultima_alteracao
		)
		where c.id = v.client_id
			and c.organizacao_id = v.organization_id
	`);

	return {
		updatedClientsCount: pendingUpdates.length,
		durationMs: Date.now() - startedAt,
	};
}

export default async function handleRFMAnalysis(req: NextApiRequest, res: NextApiResponse) {
	const startedAt = Date.now();
	// Buscar todas as organizacoes
	const organizationsList = await db.query.organizations.findMany({
		columns: { id: true },
	});

	console.log(
		`[INFO] [RFM_ANALYSIS] Starting RFM analysis for ${organizationsList.length} organizations with updateBatchSize=${RFM_UPDATE_BATCH_SIZE}`,
	);

	let processedOrganizationsCount = 0;
	let failedOrganizationsCount = 0;
	let analyzedClientsCount = 0;
	let updatedClientsCount = 0;
	let immediateInteractionsCount = 0;

	for (const organization of organizationsList) {
		const organizationStartedAt = Date.now();
		try {
			console.log(`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Starting RFM analysis`);

			const campaigns = await db.query.campaigns.findMany({
				where: (fields, { eq, and, or }) =>
					and(
						eq(fields.organizacaoId, organization.id),
						eq(fields.ativo, true),
						or(eq(fields.gatilhoTipo, "PERMANÊNCIA-SEGMENTAÇÃO"), eq(fields.gatilhoTipo, "ENTRADA-SEGMENTAÇÃO")),
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

			const campaignsForPermanenceInSegmentation = campaigns.filter((campaign) => campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO");
			const campaignsForEntryInSegmentation = campaigns.filter((campaign) => campaign.gatilhoTipo === "ENTRADA-SEGMENTAÇÃO");

			console.log(`[ORG: ${organization.id}] ${campaignsForPermanenceInSegmentation.length} campanhas de permanência em segmentação encontradas.`);
			console.log(`[ORG: ${organization.id}] ${campaignsForEntryInSegmentation.length} campanhas de entrada em segmentação encontradas.`);

			const accumulatedResultsByClient = await db
				.select({
					clientId: clients.id,
					clientRFMCurrentLabel: clients.analiseRFMTitulo,
					clientRFMLastLabelModification: clients.analiseRFMUltimaAlteracao,
					totalPurchases: sql<number>`sum(${sales.valorTotal})`,
					purchaseCount: sql<number>`count(${sales.id})`,
					lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
				})
				.from(clients)
				.leftJoin(
					sales,
					and(
						eq(sales.clienteId, clients.id),
						eq(sales.organizacaoId, organization.id),
						gte(sales.dataVenda, intervalStart),
						lte(sales.dataVenda, intervalEnd),
						eq(sales.natureza, "SN01"),
					),
				)
				.where(eq(clients.organizacaoId, organization.id))
				.groupBy(clients.id);

			console.log(
				`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Loaded ${accumulatedResultsByClient.length} clients for RFM evaluation`,
			);

			const utilsRFMReturn = await db.query.utils.findFirst({
				where: eq(utils.identificador, "CONFIG_RFM"),
			});

			const rfmConfig = utilsRFMReturn?.valor.identificador === "CONFIG_RFM" ? utilsRFMReturn.valor : null;
			if (!rfmConfig) {
				console.error(`[ORG: ${organization.id}] [ERROR] Configuração RFM não encontrada.`);
				continue;
			}

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];
			const pendingRFMClientUpdates: TRFMClientUpdateEntry[] = [];
			let flushedRFMUpdateBatchesCount = 0;
			let scheduledInteractionsCount = 0;
			let generatedCashbacksCount = 0;
			const transactionStartedAt = Date.now();

			await db.transaction(async (tx) => {
				for (const [_index, results] of accumulatedResultsByClient.entries()) {
					const calculatedRecency = dayjs().diff(dayjs(results.lastPurchaseDate), "days");
					const calculatedFrequency = results.purchaseCount;
					const calculatedMonetary = results.totalPurchases;

					const configRecency = Object.entries(rfmConfig.recencia).find(
						([_key, value]) => calculatedRecency && calculatedRecency >= value.min && calculatedRecency <= value.max,
					);
					const configFrequency = Object.entries(rfmConfig.frequencia).find(
						([_key, value]) => calculatedFrequency >= value.min && calculatedFrequency <= value.max,
					);
					const configMonetary = Object.entries(rfmConfig.monetario).find(
						([_key, value]) => calculatedMonetary >= value.min && calculatedMonetary <= value.max,
					);

					const recencyScore = configRecency ? Number(configRecency[0]) : 1;
					const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;
					const monetaryScore = configMonetary ? Number(configMonetary[0]) : 1;

					const newRFMLabel = getRFMLabel({ monetary: monetaryScore, frequency: frequencyScore, recency: recencyScore });

					// Now, comparing the new label to the previous one
					const hasClientChangedRFMLabels = results.clientRFMCurrentLabel !== newRFMLabel;
					if (hasClientChangedRFMLabels) {
						// If client has changed labels, checking for entry in campaing defined automations
						const applicableCampaigns = campaignsForEntryInSegmentation.filter(
							(c) => c.segmentacoes.some((s) => s.segmentacao === newRFMLabel) && c.gatilhoTipo === "ENTRADA-SEGMENTAÇÃO",
						);
						if (applicableCampaigns.length > 0)
							console.log(`${applicableCampaigns.length} campanhas de entrada em segmentação aplicáveis encontradas para o cliente ${results.clientId}.`);
						for (const campaign of applicableCampaigns) {
							// Validate campaign frequency before scheduling
							const canSchedule = await canScheduleCampaignForClient(
								tx,
								results.clientId,
								campaign.id,
								campaign.permitirRecorrencia,
								campaign.frequenciaIntervaloValor,
								campaign.frequenciaIntervaloMedida,
							);

							if (!canSchedule) continue;

							// For the applicable campaigns, we will iterate over them and schedule the interactions
							const interactionScheduleDate = getPostponedDateFromReferenceDate({
								date: dayjs().toDate(),
								unit: campaign.execucaoAgendadaMedida,
								value: campaign.execucaoAgendadaValor,
							});
							const [insertedInteraction] = await tx
								.insert(interactions)
								.values({
									clienteId: results.clientId,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Cliente se enquadrou no parâmetro de entrada na classificação RFM ${newRFMLabel}.`,
									agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								})
								.returning({ id: interactions.id });
							scheduledInteractionsCount += 1;

							// Check for immediate processing (execucaoAgendadaValor === 0)
							if (
								campaign.execucaoAgendadaValor === 0 &&
								campaign.whatsappTemplate &&
								campaign.whatsappConexaoTelefone?.conexao &&
								campaign.whatsappConexaoTelefoneId
							) {
								// Query client data for immediate processing
								const clientData = await tx.query.clients.findFirst({
									where: (fields, { eq }) => eq(fields.id, results.clientId),
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

							// Generate campaign cashback for ENTRADA-SEGMENTAÇÃO trigger (FIXO only)
							if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
								await generateCashbackForCampaign({
									tx,
									organizationId: organization.id,
									clientId: results.clientId,
									campaignId: campaign.id,
									cashbackType: "FIXO",
									cashbackValue: campaign.cashbackGeracaoValor,
									saleId: null,
									saleValue: null,
									expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
									expirationValue: campaign.cashbackGeracaoExpiracaoValor,
								});
								generatedCashbacksCount += 1;
							}
						}
					} else {
						const lastRFMLabelModification = results.clientRFMLastLabelModification;

						// If no previous modifications occurred, skipping
						if (!lastRFMLabelModification) continue;
						// If client has not changed labels, checking for permanence in campaing defined automations
						const applicableCampaigns = campaignsForPermanenceInSegmentation.filter((c) => {
							const isApplicableToSegmentation = c.segmentacoes.some((s) => s.segmentacao === newRFMLabel);
							const isApplicableAsPermanence = c.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO";
							if (!c.gatilhoTempoPermanenciaMedida || !c.gatilhoTempoPermanenciaValor) return false;
							const isApplicableForPermanencePeriod =
								getPeriodAmountFromReferenceUnit({
									start: lastRFMLabelModification,
									end: dayjs().toDate(),
									unit: c.gatilhoTempoPermanenciaMedida,
								}) > c.gatilhoTempoPermanenciaValor;
							if (isApplicableToSegmentation && isApplicableAsPermanence && isApplicableForPermanencePeriod) return true;
							return false;
						});
						if (applicableCampaigns.length > 0)
							console.log(
								`${applicableCampaigns.length} campanhas de permanência em segmentação aplicáveis encontradas para o cliente ${results.clientId}.`,
							);
						for (const campaign of applicableCampaigns) {
							// Checking if there is already an interaction scheduled for this campaign and client since the last label modification
							const existingInteraction = await tx.query.interactions.findFirst({
								where: and(
									eq(interactions.clienteId, results.clientId),
									eq(interactions.campanhaId, campaign.id),
									eq(interactions.organizacaoId, organization.id),
									gte(interactions.dataInsercao, lastRFMLabelModification),
								),
							});

							if (existingInteraction) continue;

							// Validate campaign frequency before scheduling
							const canSchedule = await canScheduleCampaignForClient(
								tx,
								results.clientId,
								campaign.id,
								campaign.permitirRecorrencia,
								campaign.frequenciaIntervaloValor,
								campaign.frequenciaIntervaloMedida,
							);

							if (!canSchedule) {
								console.log(
									`[ORG: ${organization.id}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${results.clientId} due to frequency limits.`,
								);
								continue;
							}

							// For the applicable campaigns, we will iterate over them and schedule the interactions
							const interactionScheduleDate = getPostponedDateFromReferenceDate({
								date: dayjs().toDate(),
								unit: campaign.execucaoAgendadaMedida,
								value: campaign.execucaoAgendadaValor,
							});
							const [insertedInteraction] = await tx
								.insert(interactions)
								.values({
									clienteId: results.clientId,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Cliente se enquadrou no parâmetro de permanência na classificação RFM ${newRFMLabel}.`,
									agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								})
								.returning({ id: interactions.id });
							scheduledInteractionsCount += 1;

							// Check for immediate processing (execucaoAgendadaValor === 0)
							if (
								campaign.execucaoAgendadaValor === 0 &&
								campaign.whatsappTemplate &&
								campaign.whatsappConexaoTelefone?.conexao &&
								campaign.whatsappConexaoTelefoneId
							) {
								// Query client data for immediate processing
								const clientData = await tx.query.clients.findFirst({
									where: (fields, { eq }) => eq(fields.id, results.clientId),
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

							// Generate campaign cashback for PERMANÊNCIA-SEGMENTAÇÃO trigger (FIXO only)
							if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
								await generateCashbackForCampaign({
									tx,
									organizationId: organization.id,
									clientId: results.clientId,
									campaignId: campaign.id,
									cashbackType: "FIXO",
									cashbackValue: campaign.cashbackGeracaoValor,
									saleId: null,
									saleValue: null,
									expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
									expirationValue: campaign.cashbackGeracaoExpiracaoValor,
								});
								generatedCashbacksCount += 1;
							}
						}
					}

					pendingRFMClientUpdates.push({
						clientId: results.clientId,
						analiseRFMTitulo: newRFMLabel,
						analiseRFMNotasFrequencia: frequencyScore.toString(),
						analiseRFMNotasRecencia: recencyScore.toString(),
						analiseRFMNotasMonetario: monetaryScore.toString(),
						analiseRFMUltimaAtualizacao: new Date(),
						analiseRFMUltimaAlteracao: hasClientChangedRFMLabels ? new Date() : results.clientRFMLastLabelModification,
					});

					if (pendingRFMClientUpdates.length >= RFM_UPDATE_BATCH_SIZE) {
						const flushSummary = await flushPendingRFMClientUpdates({
							tx,
							organizationId: organization.id,
							pendingUpdates: pendingRFMClientUpdates,
						});
						if (flushSummary.updatedClientsCount > 0) {
							flushedRFMUpdateBatchesCount += 1;
							console.log(
								`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Flushed RFM update batch ${flushedRFMUpdateBatchesCount} (${flushSummary.updatedClientsCount} clients) in ${formatDurationMs(flushSummary.durationMs)}`,
							);
						}
						pendingRFMClientUpdates.length = 0;
					}
				}

				const finalFlushSummary = await flushPendingRFMClientUpdates({
					tx,
					organizationId: organization.id,
					pendingUpdates: pendingRFMClientUpdates,
				});
				if (finalFlushSummary.updatedClientsCount > 0) {
					flushedRFMUpdateBatchesCount += 1;
					console.log(
						`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Flushed RFM update batch ${flushedRFMUpdateBatchesCount} (${finalFlushSummary.updatedClientsCount} clients) in ${formatDurationMs(finalFlushSummary.durationMs)}`,
					);
				}
			});

			console.log(
				`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Transaction completed in ${formatDurationMs(Date.now() - transactionStartedAt)} | clients=${accumulatedResultsByClient.length} | updateBatches=${flushedRFMUpdateBatchesCount} | scheduledInteractions=${scheduledInteractionsCount} | generatedCashbacks=${generatedCashbacksCount}`,
			);

			// Process interactions immediately after transaction (with delay to avoid rate limiting)
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Processing ${immediateProcessingDataList.length} immediate interactions`);
				const weeklyLimitCache = createCampaignWeeklyLimitCache();
				const immediateProcessingStartedAt = Date.now();
				for (const processingData of immediateProcessingDataList) {
					processSingleInteractionImmediately({ ...processingData, weeklyLimitCache }).catch((err) =>
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${processingData.interactionId}:`, err),
					);
					await delay(100); // Small delay between sends to avoid rate limiting
				}
				console.log(
					`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] Finished immediate interactions in ${formatDurationMs(Date.now() - immediateProcessingStartedAt)}`,
				);
			}

			processedOrganizationsCount += 1;
			analyzedClientsCount += accumulatedResultsByClient.length;
			updatedClientsCount += accumulatedResultsByClient.length;
			immediateInteractionsCount += immediateProcessingDataList.length;

			console.log(
				`[ORG: ${organization.id}] [INFO] [RFM_ANALYSIS] RFM analysis completed successfully in ${formatDurationMs(Date.now() - organizationStartedAt)} | clients=${accumulatedResultsByClient.length} | immediateInteractions=${immediateProcessingDataList.length}`,
			);
		} catch (error) {
			failedOrganizationsCount += 1;
			console.error(`[ORG: ${organization.id}] [ERROR] [RFM_ANALYSIS] Error processing RFM analysis:`, error);
			// Continuar para proxima organizacao mesmo com erro
		}
	}

	console.log(
		`[INFO] [RFM_ANALYSIS] Completed in ${formatDurationMs(Date.now() - startedAt)} | organizations=${processedOrganizationsCount}/${organizationsList.length} | failedOrganizations=${failedOrganizationsCount} | analyzedClients=${analyzedClientsCount} | updatedClients=${updatedClientsCount} | immediateInteractions=${immediateInteractionsCount}`,
	);

	return res.status(200).json("ANÁLISE RFM FEITA COM SUCESSO !");
}

function formatDurationMs(durationMs: number) {
	if (durationMs < 1000) return `${durationMs}ms`;

	const seconds = durationMs / 1000;
	if (seconds < 60) return `${seconds.toFixed(2)}s`;

	return `${(seconds / 60).toFixed(2)}min`;
}
