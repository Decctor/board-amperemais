import { appApiHandler } from "@/lib/app-api";
import { applyCampaignBonusToInteractionMetadata, buildBaseCashbackInteractionMetadata } from "@/lib/campaigns/interaction-metadata";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { interactions, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
	const sorted = salesByDayOfWeek.sort((a, b) => Number(a.totalValue ?? 0) - Number(b.totalValue ?? 0) || a.dayOfWeek - b.dayOfWeek);

	return sorted[0].dayOfWeek;
}

async function getWorstSalesDayNotifyRoute(_req: NextRequest) {
	console.log("[INFO] [WORST_SALES_DAY_NOTIFY] Starting worst sales day notification cron job");

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
				// Find active PIOR-DIA-VENDAS campaigns for this org
				const worstDayCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "PIOR-DIA-VENDAS")),
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

				const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: { terminologia: true },
				});
				const cashbackTerminology = cashbackProgram?.terminologia ?? "DINHEIRO";
				const runningBalanceByClientId = new Map<string, { available: number; accumulated: number }>();

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
						console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Target DOW ${targetDayOfWeek} !== worst DOW ${worstDayOfWeek}. Skipping.`);
						continue;
					}

					console.log(
						`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Direction: ${campaign.execucaoAgendadaDirecao}, ` +
							`Target DOW matches worst day (${worstDayOfWeek}). Scheduling interactions.`,
					);

					const targetClientIds = await resolveCampaignAudienceClientIdsForCampaign({
						executor: tx,
						organizationId: organization.id,
						campaign,
					});

					console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${targetClientIds.length} matching clients.`);

					const clientBalances =
						targetClientIds.length > 0
							? await tx.query.cashbackProgramBalances.findMany({
									where: (fields, { and, eq, inArray }) =>
										and(eq(fields.organizacaoId, organization.id), inArray(fields.clienteId, targetClientIds)),
									columns: {
										clienteId: true,
										saldoValorDisponivel: true,
										saldoValorAcumuladoTotal: true,
										saldoValorResgatadoTotal: true,
									},
								})
							: [];
					const clientBalanceMap = new Map(clientBalances.map((balance) => [balance.clienteId, balance]));

					for (const clientId of targetClientIds) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (canSchedule) {
							const clientBalance = clientBalanceMap.get(clientId);
							const running = runningBalanceByClientId.get(clientId) ?? {
								available: clientBalance?.saldoValorDisponivel ?? 0,
								accumulated: clientBalance?.saldoValorAcumuladoTotal ?? 0,
							};
							const interactionId = crypto.randomUUID();
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
								clientId,
								saleId: null,
								saleValue: null,
								interactionId,
								enabled: campaign.cashbackGeracaoTipo === "FIXO",
							});
							runningBalanceByClientId.set(clientId, {
								available: bonusResult.runningAvailableBalance,
								accumulated: bonusResult.runningAccumulatedTotal,
							});
							const interactionContextMetadados = bonusResult.metadata;

							const [insertedInteraction] = await tx
								.insert(interactions)
								.values({
									id: interactionId,
									clienteId: clientId,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Pior dia de vendas: ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Campanha para o pior dia de vendas da semana.`,
									agendamentoDataReferencia: scheduleDate,
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
									metadados: interactionContextMetadados,
								})
								.returning({ id: interactions.id });

							// Check for immediate processing
							const isImmediate = isAntes || campaign.execucaoAgendadaValor === 0;
							if (isImmediate && campaign.whatsappTemplate) {
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
										metadataProdutoSugeridoId: true,
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
								}
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
					weeklyLimitCache: createCampaignWeeklyLimitCache(),
				});
				if (processingSummary.failed > 0 || processingSummary.blocked > 0) {
					for (const failedResult of processingSummary.results.filter((itemResult) => !itemResult.success)) {
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${failedResult.interactionId}:`, failedResult.error);
					}
				}
			}
		}

		console.log("[INFO] [WORST_SALES_DAY_NOTIFY] All organizations processed successfully");
		return NextResponse.json("EXECUTADO COM SUCESSO", { status: 200 });
	} catch (error) {
		console.error("[ERROR] [WORST_SALES_DAY_NOTIFY] Fatal error:", error);
		return NextResponse.json(
			{
				error: "Failed to process worst sales day notifications",
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
		return getWorstSalesDayNotifyRoute(req);
	},
});
