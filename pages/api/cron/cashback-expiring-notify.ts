import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, cashbackProgramTransactions, interactions, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gt, lte } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

const EXPIRING_SOON_DAYS = 3;

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

const handleCashbackExpiringNotify = async (req: NextApiRequest, res: NextApiResponse) => {
	console.log("[INFO] [CASHBACK_EXPIRING_NOTIFY] Starting cashback expiring notification cron job");

	try {
		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		const today = dayjs().toDate();
		const soonDate = dayjs().add(EXPIRING_SOON_DAYS, "day").toDate();

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			await db.transaction(async (tx) => {
				// Get active campaigns for expiring cashback notifications
				const campaignsForExpiration = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "CASHBACK-EXPIRANDO")),
				});

				if (campaignsForExpiration.length === 0) {
					console.log(`[ORG: ${organization.id}] No active CASHBACK-EXPIRANDO campaigns found. Skipping.`);
					return;
				}

				// Handle Expiring Soon (Notify)
				const expiringSoonTransactions = await tx.query.cashbackProgramTransactions.findMany({
					where: (fields, { and, eq, gt, lte }) =>
						and(
							eq(fields.organizacaoId, organization.id),
							eq(fields.tipo, "ACÚMULO"),
							eq(fields.status, "ATIVO"),
							gt(fields.valorRestante, 0),
							gt(fields.expiracaoData, today),
							lte(fields.expiracaoData, soonDate),
						),
				});

				console.log(`[ORG: ${organization.id}] Found ${expiringSoonTransactions.length} transactions expiring soon.`);

				// Group transactions by clienteId and sum valorRestante
				const cashbackByClient = new Map<string, number>();

				for (const transaction of expiringSoonTransactions) {
					const currentTotal = cashbackByClient.get(transaction.clienteId) || 0;
					cashbackByClient.set(transaction.clienteId, currentTotal + transaction.valorRestante);
				}

				console.log(`[ORG: ${organization.id}] Found ${cashbackByClient.size} clients with expiring cashback.`);

				// Schedule notifications for each client
				for (const [clienteId, totalExpiring] of cashbackByClient.entries()) {
					for (const campaign of campaignsForExpiration) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clienteId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (canSchedule) {
							const interactionScheduleDate = getPostponedDateFromReferenceDate({
								date: dayjs().toDate(),
								unit: campaign.execucaoAgendadaMedida,
								value: campaign.execucaoAgendadaValor,
							});

							await tx.insert(interactions).values({
								clienteId: clienteId,
								campanhaId: campaign.id,
								organizacaoId: organization.id,
								titulo: `Cashback Expirando: ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Você tem R$ ${(totalExpiring / 100).toFixed(2)} em cashback expirando nos próximos ${EXPIRING_SOON_DAYS} dias.`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							});

							// Generate campaign cashback for CASHBACK-EXPIRANDO trigger (FIXO only)
							if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
								await generateCashbackForCampaign({
									tx,
									organizationId: organization.id,
									clientId: clienteId,
									campaignId: campaign.id,
									cashbackType: "FIXO",
									cashbackValue: campaign.cashbackGeracaoValor,
									saleValue: null,
									expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
									expirationValue: campaign.cashbackGeracaoExpiracaoValor,
								});
							}
						}
					}
				}
			});
		}

		console.log("[INFO] [CASHBACK_EXPIRING_NOTIFY] All organizations processed successfully");
		return res.status(200).json("EXECUTADO COM SUCESSO");
	} catch (error) {
		console.error("[ERROR] [CASHBACK_EXPIRING_NOTIFY] Fatal error:", error);
		return res.status(500).json({
			error: "Failed to process cashback expiring notifications",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export default handleCashbackExpiringNotify;
