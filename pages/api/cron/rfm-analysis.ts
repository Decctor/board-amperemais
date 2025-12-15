import type { TSale } from "@/schemas/sales";
import dayjs, { type ManipulateType } from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getPeriodAmountFromReferenceUnit, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { TimeDurationUnitsEnum } from "@/schemas/enums";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { type TSaleEntity, clients, interactions, sales, utils } from "@/services/drizzle/schema";
import { type TRFMConfig, getRFMLabel } from "@/utils/rfm";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";

export const config = {
	maxDuration: 25,
};

const intervalStart = dayjs().subtract(12, "month").startOf("day").toDate();
const intervalEnd = dayjs().endOf("day").toDate();

export default async function handleRFMAnalysis(req: NextApiRequest, res: NextApiResponse) {
	const campaigns = await db.query.campaigns.findMany({
		where: (fields, { eq, and, or }) =>
			and(eq(fields.ativo, true), or(eq(fields.gatilhoTipo, "PERMANÊNCIA-SEGMENTAÇÃO"), eq(fields.gatilhoTipo, "ENTRADA-SEGMENTAÇÃO"))),
		with: {
			segmentacoes: true,
		},
	});

	const campaignsForPermanenceInSegmentation = campaigns.filter((campaign) => campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO");
	const campaignsForEntryInSegmentation = campaigns.filter((campaign) => campaign.gatilhoTipo === "ENTRADA-SEGMENTAÇÃO");

	console.log(`${campaignsForPermanenceInSegmentation.length} campanhas de permanência em segmentação encontradas.`);
	console.log(`${campaignsForEntryInSegmentation.length} campanhas de entrada em segmentação encontradas.`);

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
			and(eq(sales.clienteId, clients.id), gte(sales.dataVenda, intervalStart), lte(sales.dataVenda, intervalEnd), eq(sales.natureza, "SN01")),
		)
		.groupBy(clients.id);

	const utilsRFMReturn = await db.query.utils.findFirst({
		where: eq(utils.identificador, "CONFIG_RFM"),
	});

	const rfmConfig = utilsRFMReturn?.valor.identificador === "CONFIG_RFM" ? utilsRFMReturn.valor : null;
	if (!rfmConfig) throw new createHttpError.InternalServerError("Configuração RFM não encontrada.");

	return await db.transaction(async (tx) => {
		for (const [index, results] of accumulatedResultsByClient.entries()) {
			// If the index is a multiple of 25, logging the progress
			if ((index + 1) % 25 === 0) console.log(`Processando o cliente ${index + 1} de ${accumulatedResultsByClient.length}`);
			const calculatedRecency = dayjs().diff(dayjs(results.lastPurchaseDate), "days");
			const calculatedFrequency = results.purchaseCount;
			const calculatedMonetary = results.totalPurchases;

			const configRecency = Object.entries(rfmConfig.recencia).find(
				([key, value]) => calculatedRecency && calculatedRecency >= value.min && calculatedRecency <= value.max,
			);
			const configFrequency = Object.entries(rfmConfig.frequencia).find(
				([key, value]) => calculatedFrequency >= value.min && calculatedFrequency <= value.max,
			);
			const configMonetary = Object.entries(rfmConfig.monetario).find(
				([key, value]) => calculatedMonetary >= value.min && calculatedMonetary <= value.max,
			);

			const recencyScore = configRecency ? Number(configRecency[0]) : 1;
			const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;
			const monetaryScore = configMonetary ? Number(configMonetary[0]) : 1;

			const newRFMLabel = getRFMLabel({ monetary: monetaryScore, frequency: frequencyScore, recency: recencyScore });

			// Now, comparing the new label to the previous one
			const hasClientChangedRFMLabels = results.clientRFMCurrentLabel !== newRFMLabel;
			if (hasClientChangedRFMLabels) {
				console.log(`Cliente ${results.clientId} mudou de classificação RFM de ${results.clientRFMCurrentLabel} para ${newRFMLabel}.`);
				// If client has changed labels, checking for entry in campaing defined automations
				const applicableCampaigns = campaignsForEntryInSegmentation.filter(
					(c) => c.segmentacoes.some((s) => s.segmentacao === newRFMLabel) && c.gatilhoTipo === "ENTRADA-SEGMENTAÇÃO",
				);
				if (applicableCampaigns.length > 0)
					console.log(`${applicableCampaigns.length} campanhas de entrada em segmentação aplicáveis encontradas para o cliente ${results.clientId}.`);
				for (const campaign of applicableCampaigns) {
					// For the applicable campaigns, we will iterate over them and schedule the interactions
					const interactionScheduleDate = getPostponedDateFromReferenceDate({
						date: dayjs().toDate(),
						unit: campaign.execucaoAgendadaMedida,
						value: campaign.execucaoAgendadaValor,
					});
					await tx.insert(interactions).values({
						clienteId: results.clientId,
						campanhaId: campaign.id,
						titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
						tipo: "ENVIO-MENSAGEM",
						descricao: `Cliente se enquadrou no parâmetro de entrada na classificação RFM ${newRFMLabel}.`,
						agendamentoDataReferencia: interactionScheduleDate.toISOString(),
						agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
					});
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
					console.log(`${applicableCampaigns.length} campanhas de permanência em segmentação aplicáveis encontradas para o cliente ${results.clientId}.`);
				for (const campaign of applicableCampaigns) {
					// Checking if there is already an interaction scheduled for this campaign and client since the last label modification
					const existingInteraction = await tx.query.interactions.findFirst({
						where: and(
							eq(interactions.clienteId, results.clientId),
							eq(interactions.campanhaId, campaign.id),
							gte(interactions.dataInsercao, lastRFMLabelModification),
						),
					});

					if (existingInteraction) continue;
					// For the applicable campaigns, we will iterate over them and schedule the interactions
					const interactionScheduleDate = getPostponedDateFromReferenceDate({
						date: dayjs().toDate(),
						unit: campaign.execucaoAgendadaMedida,
						value: campaign.execucaoAgendadaValor,
					});
					await tx.insert(interactions).values({
						clienteId: results.clientId,
						campanhaId: campaign.id,
						titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
						tipo: "ENVIO-MENSAGEM",
						descricao: `Cliente se enquadrou no parâmetro de permanência na classificação RFM ${newRFMLabel}.`,
						agendamentoDataReferencia: interactionScheduleDate.toISOString(),
						agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
					});
				}
			}
			await tx
				.update(clients)
				.set({
					analiseRFMTitulo: newRFMLabel,
					analiseRFMNotasFrequencia: frequencyScore.toString(),
					analiseRFMNotasRecencia: recencyScore.toString(),
					analiseRFMNotasMonetario: monetaryScore.toString(),
					analiseRFMUltimaAtualizacao: new Date(),
					analiseRFMUltimaAlteracao: hasClientChangedRFMLabels ? new Date() : results.clientRFMLastLabelModification,
				})
				.where(eq(clients.id, results.clientId));
		}
		return res.status(200).json("ANÁLISE RFM FEITA COM SUCESSO !");
	});
}
