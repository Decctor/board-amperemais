import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
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
		const currentMonth = today.month() + 1; // dayjs months are 0-indexed
		const currentDay = today.date();

		for (const organization of organizationsList) {
			console.log(`[ORG: ${organization.id}] Processing organization...`);

			await db.transaction(async (tx) => {
				// Get active campaigns for birthday notifications
				const birthdayCampaigns = await tx.query.campaigns.findMany({
					where: (fields, { and, eq }) =>
						and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "ANIVERSARIO_CLIENTE")),
				});

				if (birthdayCampaigns.length === 0) {
					console.log(`[ORG: ${organization.id}] No active ANIVERSARIO_CLIENTE campaigns found. Skipping.`);
					return;
				}

				// Find clients whose birthday matches today (month and day)
				const birthdayClients = await tx
					.select({
						id: clients.id,
						nome: clients.nome,
					})
					.from(clients)
					.where(
						and(
							eq(clients.organizacaoId, organization.id),
							sql`EXTRACT(MONTH FROM ${clients.dataNascimento}) = ${currentMonth}`,
							sql`EXTRACT(DAY FROM ${clients.dataNascimento}) = ${currentDay}`,
						),
					);

				console.log(`[ORG: ${organization.id}] Found ${birthdayClients.length} clients with birthday today.`);

				// Schedule notifications for each client
				for (const client of birthdayClients) {
					for (const campaign of birthdayCampaigns) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							client.id,
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
								clienteId: client.id,
								campanhaId: campaign.id,
								organizacaoId: organization.id,
								titulo: `Aniversário: ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Feliz aniversário, ${client.nome}!`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							});

							// Generate campaign cashback for ANIVERSARIO_CLIENTE trigger (FIXO only)
							if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
								await generateCashbackForCampaign({
									tx,
									organizationId: organization.id,
									clientId: client.id,
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
