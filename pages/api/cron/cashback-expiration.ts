import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import { campaigns, cashbackProgramBalances, cashbackProgramTransactions, interactions, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gt, lte } from "drizzle-orm";
import type { NextApiHandler } from "next";

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

const handleCashbackExpiration: NextApiHandler<string> = async (req, res) => {
	console.log("[INFO] [CASHBACK_EXPIRATION] Starting cashback expiration cron job");

	return res.status(200).json("EXECUTADO COM SUCESSO");
	// try {
	// 	const organizationsList = await db.query.organizations.findMany({
	// 		columns: { id: true },
	// 	});

	// 	const today = dayjs().toDate();
	// 	const soonDate = dayjs().add(EXPIRING_SOON_DAYS, "day").toDate();

	// 	for (const organization of organizationsList) {
	// 		console.log(`[ORG: ${organization.id}] Processing organization...`);

	// 		await db.transaction(async (tx) => {
	// 			const campaignsForExpiration = await tx.query.campaigns.findMany({
	// 				where: (fields, { and, eq }) =>
	// 					and(eq(fields.organizacaoId, organization.id), eq(fields.ativo, true), eq(fields.gatilhoTipo, "CASHBACK-EXPIRANDO")),
	// 			});

	// 			// 1. Handle Expired Cashback
	// 			const expiredTransactions = await tx.query.cashbackProgramTransactions.findMany({
	// 				where: (fields, { and, eq, gt, lte }) =>
	// 					and(
	// 						eq(fields.organizacaoId, organization.id),
	// 						eq(fields.tipo, "ACÚMULO"),
	// 						eq(fields.status, "ATIVO"),
	// 						gt(fields.valorRestante, 0),
	// 						lte(fields.expiracaoData, today),
	// 					),
	// 			});

	// 			console.log(`[ORG: ${organization.id}] Found ${expiredTransactions.length} expired transactions.`);

	// 			for (const transaction of expiredTransactions) {
	// 				const valorExpirado = transaction.valorRestante;

	// 				const balance = await tx.query.cashbackProgramBalances.findFirst({
	// 					where: (fields, { and, eq }) =>
	// 						and(eq(fields.clienteId, transaction.clienteId), eq(fields.programaId, transaction.programaId), eq(fields.organizacaoId, organization.id)),
	// 				});

	// 				if (balance) {
	// 					const previousBalance = balance.saldoValorDisponivel;
	// 					const newBalance = previousBalance - valorExpirado;

	// 					// Create EXPIRAÇÃO transaction
	// 					await tx.insert(cashbackProgramTransactions).values({
	// 						organizacaoId: organization.id,
	// 						clienteId: transaction.clienteId,
	// 						programaId: transaction.programaId,
	// 						tipo: "EXPIRAÇÃO",
	// 						status: "EXPIRADO",
	// 						valor: -valorExpirado,
	// 						valorRestante: 0,
	// 						saldoValorAnterior: previousBalance,
	// 						saldoValorPosterior: newBalance,
	// 						dataInsercao: new Date(),
	// 					});

	// 					// Mark original transaction as EXPIRADO
	// 					await tx
	// 						.update(cashbackProgramTransactions)
	// 						.set({
	// 							status: "EXPIRADO",
	// 							valorRestante: 0,
	// 							dataAtualizacao: new Date(),
	// 						})
	// 						.where(eq(cashbackProgramTransactions.id, transaction.id));

	// 					// Update client balance
	// 					await tx
	// 						.update(cashbackProgramBalances)
	// 						.set({
	// 							saldoValorDisponivel: newBalance,
	// 							dataAtualizacao: new Date(),
	// 						})
	// 						.where(eq(cashbackProgramBalances.id, balance.id));

	// 					// Schedule notification for just expired
	// 					for (const campaign of campaignsForExpiration) {
	// 						const canSchedule = await canScheduleCampaignForClient(
	// 							tx,
	// 							transaction.clienteId,
	// 							campaign.id,
	// 							campaign.permitirRecorrencia,
	// 							campaign.frequenciaIntervaloValor,
	// 							campaign.frequenciaIntervaloMedida,
	// 						);

	// 						if (canSchedule) {
	// 							const interactionScheduleDate = getPostponedDateFromReferenceDate({
	// 								date: dayjs().toDate(),
	// 								unit: campaign.execucaoAgendadaMedida,
	// 								value: campaign.execucaoAgendadaValor,
	// 							});

	// 							await tx.insert(interactions).values({
	// 								clienteId: transaction.clienteId,
	// 								campanhaId: campaign.id,
	// 								organizacaoId: organization.id,
	// 								titulo: `Cashback Expirado: ${campaign.titulo}`,
	// 								tipo: "ENVIO-MENSAGEM",
	// 								descricao: `Seu cashback de R$ ${(valorExpirado / 100).toFixed(2)} expirou hoje.`,
	// 								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
	// 								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
	// 							});
	// 						}
	// 					}
	// 				}
	// 			}

	// 			// 2. Handle Expiring Soon (Notify)
	// 			const expiringSoonTransactions = await tx.query.cashbackProgramTransactions.findMany({
	// 				where: (fields, { and, eq, gt, lte }) =>
	// 					and(
	// 						eq(fields.organizacaoId, organization.id),
	// 						eq(fields.tipo, "ACÚMULO"),
	// 						eq(fields.status, "ATIVO"),
	// 						gt(fields.valorRestante, 0),
	// 						gt(fields.expiracaoData, today),
	// 						lte(fields.expiracaoData, soonDate),
	// 					),
	// 			});

	// 			console.log(`[ORG: ${organization.id}] Found ${expiringSoonTransactions.length} transactions expiring soon.`);

	// 			for (const transaction of expiringSoonTransactions) {
	// 				for (const campaign of campaignsForExpiration) {
	// 					const canSchedule = await canScheduleCampaignForClient(
	// 						tx,
	// 						transaction.clienteId,
	// 						campaign.id,
	// 						campaign.permitirRecorrencia,
	// 						campaign.frequenciaIntervaloValor,
	// 						campaign.frequenciaIntervaloMedida,
	// 					);

	// 					if (canSchedule) {
	// 						const interactionScheduleDate = getPostponedDateFromReferenceDate({
	// 							date: dayjs().toDate(),
	// 							unit: campaign.execucaoAgendadaMedida,
	// 							value: campaign.execucaoAgendadaValor,
	// 						});

	// 						await tx.insert(interactions).values({
	// 							clienteId: transaction.clienteId,
	// 							campanhaId: campaign.id,
	// 							organizacaoId: organization.id,
	// 							titulo: `Cashback Expirando: ${campaign.titulo}`,
	// 							tipo: "ENVIO-MENSAGEM",
	// 							descricao: `Seu cashback de R$ ${(transaction.valorRestante / 100).toFixed(2)} expira em ${dayjs(transaction.expiracaoData).format("DD/MM/YYYY")}.`,
	// 							agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
	// 							agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
	// 						});
	// 					}
	// 				}
	// 			}
	// 		});
	// 	}

	// 	console.log("[INFO] [CASHBACK_EXPIRATION] All organizations processed successfully");
	// 	return res.status(200).json("EXECUTADO COM SUCESSO");
	// } catch (error) {
	// 	console.error("[ERROR] [CASHBACK_EXPIRATION] Fatal error:", error);
	// 	return res.status(500).json({
	// 		error: "Failed to process cashback expiration",
	// 		message: error instanceof Error ? error.message : "Unknown error",
	// 	});
	// }
};

export default handleCashbackExpiration;
