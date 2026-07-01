import { appApiHandler } from "@/lib/app-api";
import { applyCampaignBonusToInteractionMetadata } from "@/lib/campaigns/interaction-metadata";
import { resolveCampaignAudienceClientIdsForCampaign } from "@/lib/campaigns/filters";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatDateAsLocale } from "@/lib/formatting";
import { type ImmediateProcessingData, processOrganizationInteractionsBatch } from "@/lib/interactions";
import { createCampaignWeeklyLimitCache } from "@/lib/interactions/campaign-weekly-limits";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_VALOR = 3;
const DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_MEDIDA: TTimeDurationUnitsEnum = "DIAS";

function formatCashbackExpiringWindow(value: number, measure: TTimeDurationUnitsEnum) {
	const labels: Record<TTimeDurationUnitsEnum, { singular: string; plural: string }> = {
		MINUTOS: { singular: "minuto", plural: "minutos" },
		HORAS: { singular: "hora", plural: "horas" },
		DIAS: { singular: "dia", plural: "dias" },
		SEMANAS: { singular: "semana", plural: "semanas" },
		MESES: { singular: "mês", plural: "meses" },
		ANOS: { singular: "ano", plural: "anos" },
	};
	const label = value === 1 ? labels[measure].singular : labels[measure].plural;
	return `nos próximos ${value} ${label}`;
}

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

async function getCashbackExpiringNotifyRoute(_req: NextRequest) {
	console.log("[INFO] [CASHBACK_EXPIRING_NOTIFY] Starting cashback expiring notification cron job");

	try {
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		const today = dayjs().startOf("day").toDate();

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			await db.transaction(async (tx) => {
				const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: { terminologia: true },
				});
				const cashbackTerminology = cashbackProgram?.terminologia ?? "DINHEIRO";

				// Get active campaigns for expiring cashback notifications
				const campaignsForExpiration = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "CASHBACK-EXPIRANDO")),
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

				if (campaignsForExpiration.length === 0) {
					console.log(`[ORG: ${organization.id}] No active CASHBACK-EXPIRANDO campaigns found. Skipping.`);
					return;
				}

				for (const campaign of campaignsForExpiration) {
					const effectiveAntecedenciaValor =
						campaign.gatilhoCashbackExpirandoAntecedenciaValor && campaign.gatilhoCashbackExpirandoAntecedenciaValor > 0
							? campaign.gatilhoCashbackExpirandoAntecedenciaValor
							: DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_VALOR;
					const effectiveAntecedenciaMedida = campaign.gatilhoCashbackExpirandoAntecedenciaMedida ?? DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_MEDIDA;

					if (!campaign.gatilhoCashbackExpirandoAntecedenciaValor || campaign.gatilhoCashbackExpirandoAntecedenciaValor <= 0) {
						console.log(
							`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Antecedência não configurada. Aplicando fallback para ${DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_VALOR} ${DEFAULT_CASHBACK_EXPIRING_ANTECEDENCIA_MEDIDA}.`,
						);
					}

					const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[effectiveAntecedenciaMedida] || "day";
					const windowEndDate = dayjs().add(effectiveAntecedenciaValor, dayjsUnit).endOf("day").toDate();
					const cashbackExpiringWindow = formatCashbackExpiringWindow(effectiveAntecedenciaValor, effectiveAntecedenciaMedida);

					const expiringSoonTransactions = await tx.query.cashbackProgramTransactions.findMany({
						where: (fields, { and, eq, gt, lte }) =>
							and(
								eq(fields.organizacaoId, organization.id),
								eq(fields.tipo, "ACÚMULO"),
								eq(fields.status, "ATIVO"),
								gt(fields.valorRestante, 0),
								gt(fields.expiracaoData, today),
								lte(fields.expiracaoData, windowEndDate),
							),
					});

					console.log(
						`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${expiringSoonTransactions.length} transactions expiring within ${effectiveAntecedenciaValor} ${effectiveAntecedenciaMedida}.`,
					);

					const cashbackByClient = new Map<string, { totalExpiring: number; windowEndDate: Date }>();

					for (const transaction of expiringSoonTransactions) {
						const current = cashbackByClient.get(transaction.clienteId);

						if (!current) {
							cashbackByClient.set(transaction.clienteId, {
								totalExpiring: transaction.valorRestante,
								windowEndDate,
							});
							continue;
						}

						cashbackByClient.set(transaction.clienteId, {
							totalExpiring: current.totalExpiring + transaction.valorRestante,
							windowEndDate,
						});
					}

					const audienceClientIds = new Set(
						await resolveCampaignAudienceClientIdsForCampaign({
							executor: tx,
							organizationId: organization.id,
							campaign,
						}),
					);
					for (const clienteId of Array.from(cashbackByClient.keys())) {
						if (!audienceClientIds.has(clienteId)) cashbackByClient.delete(clienteId);
					}

					console.log(`[ORG: ${organization.id}] [CAMPAIGN: ${campaign.id}] Found ${cashbackByClient.size} clients with expiring cashback.`);

					const clientIds = Array.from(cashbackByClient.keys());
					const clientBalances =
						clientIds.length > 0
							? await tx.query.cashbackProgramBalances.findMany({
									where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organization.id), inArray(fields.clienteId, clientIds)),
									columns: { clienteId: true, saldoValorDisponivel: true, saldoValorAcumuladoTotal: true, saldoValorResgatadoTotal: true },
								})
							: [];
					const clientBalanceMap = new Map(clientBalances.map((b) => [b.clienteId, b]));

					for (const [clienteId, cashbackInfo] of cashbackByClient.entries()) {
						const minimumExpiringValue = campaign.gatilhoCashbackExpirandoValorMinimo ?? 0;
						if (minimumExpiringValue > 0 && cashbackInfo.totalExpiring < minimumExpiringValue) continue;

						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clienteId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) continue;

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						const clientBalance = clientBalanceMap.get(clienteId);
						const bonusResult = await applyCampaignBonusToInteractionMetadata({
							tx,
							baseMetadata: {
								terminologia: cashbackTerminology,
								cashbackExpirandoValor: cashbackInfo.totalExpiring,
								cashbackExpirandoData: formatDateAsLocale(cashbackInfo.windowEndDate) ?? undefined,
								cashbackExpirandoJanela: cashbackExpiringWindow,
								cashbackSaldoDisponivel: clientBalance?.saldoValorDisponivel ?? 0,
								cashbackTotalAcumuladoVida: clientBalance?.saldoValorAcumuladoTotal ?? 0,
								cashbackTotalResgatadoVida: clientBalance?.saldoValorResgatadoTotal ?? 0,
							},
							campaign,
							organizationId: organization.id,
							clientId: clienteId,
							saleId: null,
							saleValue: null,
							enabled: campaign.cashbackGeracaoTipo === "FIXO",
						});
						const interactionContextMetadados = bonusResult.metadata;

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clienteId,
								campanhaId: campaign.id,
								organizacaoId: organization.id,
								titulo: `Cashback Expirando: ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Você tem R$ ${(cashbackInfo.totalExpiring / 100).toFixed(2)} em cashback expirando nos próximos ${effectiveAntecedenciaValor} ${effectiveAntecedenciaMedida.toLowerCase()}.`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								metadados: interactionContextMetadados,
							})
							.returning({ id: interactions.id });

						if (campaign.execucaoAgendadaValor === 0 && campaign.whatsappTemplate) {
							const clientData = await tx.query.clients.findFirst({
								where: (fields, { eq }) => eq(fields.id, clienteId),
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
									client: clientData,
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
		}

		console.log("[INFO] [CASHBACK_EXPIRING_NOTIFY] All organizations processed successfully");
		return NextResponse.json("EXECUTADO COM SUCESSO", { status: 200 });
	} catch (error) {
		console.error("[ERROR] [CASHBACK_EXPIRING_NOTIFY] Fatal error:", error);
		return NextResponse.json(
			{
				error: "Failed to process cashback expiring notifications",
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
		return getCashbackExpiringNotifyRoute(req);
	},
});
