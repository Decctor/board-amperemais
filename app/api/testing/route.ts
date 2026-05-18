import dayjs from "dayjs";
import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { appApiHandler } from "@/lib/app-api";
import { db } from "@/services/drizzle";
import { sales, utils } from "@/services/drizzle/schema";
import type { TRFMConfig } from "@/utils/rfm";

const DEFAULT_ORGANIZATION_ID = "4a4e8578-63f0-4119-9695-a2cc068de8d6";
const DEFAULT_ANALYSIS_MONTHS = 12;
const PERCENTILES = [0, 5, 10, 20, 25, 40, 50, 60, 75, 80, 90, 95, 100] as const;

type TScoreKey = "1" | "2" | "3" | "4" | "5";
type TMetricRow = {
	clienteId: string;
	totalPurchases: number | string | null;
	purchaseCount: number | string | null;
	lastPurchaseDate: Date | string | null;
	firstPurchaseDate: Date | string | null;
};
type TRFMRanges = Record<TScoreKey, { min: number; max: number }>;

function toNumber(value: number | string | null | undefined) {
	return Number(value ?? 0);
}

function percentile(values: number[], percentileValue: number) {
	if (values.length === 0) return null;
	const sortedValues = [...values].sort((a, b) => a - b);
	const index = (percentileValue / 100) * (sortedValues.length - 1);
	const lowerIndex = Math.floor(index);
	const upperIndex = Math.ceil(index);
	const lowerValue = sortedValues[lowerIndex] ?? 0;
	const upperValue = sortedValues[upperIndex] ?? lowerValue;

	if (lowerIndex === upperIndex) return lowerValue;

	return lowerValue + (upperValue - lowerValue) * (index - lowerIndex);
}

function summarizeMetric(values: number[]) {
	const percentiles = Object.fromEntries(PERCENTILES.map((p) => [`p${p}`, percentile(values, p)]));
	const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

	return {
		count: values.length,
		average,
		percentiles,
	};
}

function buildSuggestedRanges(values: number[], higherIsBetter: boolean) {
	const p20 = percentile(values, 20) ?? 0;
	const p40 = percentile(values, 40) ?? 0;
	const p60 = percentile(values, 60) ?? 0;
	const p80 = percentile(values, 80) ?? 0;
	const max = percentile(values, 100) ?? 0;
	const min = percentile(values, 0) ?? 0;

	const ascendingRanges = {
		"1": { min, max: p20 },
		"2": { min: p20, max: p40 },
		"3": { min: p40, max: p60 },
		"4": { min: p60, max: p80 },
		"5": { min: p80, max },
	} satisfies Record<TScoreKey, { min: number; max: number }>;

	if (higherIsBetter) return ascendingRanges;

	return {
		"5": { min, max: p20 },
		"4": { min: p20, max: p40 },
		"3": { min: p40, max: p60 },
		"2": { min: p60, max: p80 },
		"1": { min: p80, max },
	} satisfies Record<TScoreKey, { min: number; max: number }>;
}

function scoreByConfig(value: number, ranges: TRFMRanges) {
	const matchedScore = Object.entries(ranges).find(([, range]) => value >= range.min && value <= range.max)?.[0];

	return matchedScore ? Number(matchedScore) : 1;
}

function getLocalRFMLabel({ monetary, frequency, recency }: { monetary: number; frequency: number; recency: number }) {
	const valueScore = Math.round((frequency + monetary) / 2);

	if (recency >= 4 && frequency >= 4 && monetary >= 4) return "CAMPEÕES";
	if (recency >= 4 && valueScore >= 4) return "CLIENTES LEAIS";
	if (recency >= 4 && frequency <= 2) return "CLIENTES RECENTES";
	if (recency >= 4) return "PROMISSORES";

	if (recency === 3 && valueScore >= 4) return "POTENCIAIS CLIENTES LEAIS";
	if (recency === 3 && valueScore >= 3) return "PRECISAM DE ATENÇÃO";
	if (recency === 3) return "PRESTES A DORMIR";

	if (recency === 2 && valueScore >= 4) return "NÃO PODE PERDÊ-LOS";
	if (recency === 2 && valueScore >= 3) return "EM RISCO";
	if (recency === 2) return "HIBERNANDO";

	if (valueScore >= 4) return "NÃO PODE PERDÊ-LOS";
	if (valueScore >= 3) return "HIBERNANDO";

	return "PERDIDOS";
}

export const GET = appApiHandler({
	GET: async (req: NextRequest) => {
		const searchParams = req.nextUrl.searchParams;
		const organizationId = searchParams.get("organizacaoId") || DEFAULT_ORGANIZATION_ID;
		const analysisMonths = Number(searchParams.get("months") ?? DEFAULT_ANALYSIS_MONTHS);

		if (!organizationId) {
			return NextResponse.json(
				{
					data: null,
					message: "Informe a organização em ?organizacaoId=ID_DA_ORGANIZACAO ou preencha DEFAULT_ORGANIZATION_ID no arquivo.",
				},
				{ status: 400 },
			);
		}

		const intervalStart = dayjs()
			.subtract(Number.isFinite(analysisMonths) ? analysisMonths : DEFAULT_ANALYSIS_MONTHS, "month")
			.startOf("day")
			.toDate();
		const intervalEnd = dayjs().endOf("day").toDate();

		const rfmConfigReturn = await db.query.utils.findFirst({
			where: and(eq(utils.identificador, "CONFIG_RFM"), eq(utils.organizacaoId, organizationId)),
			with: {
				organizacao: true,
			},
		});
		const rfmConfig = rfmConfigReturn?.valor as TRFMConfig | undefined;

		if (!rfmConfig || rfmConfig.identificador !== "CONFIG_RFM") {
			return NextResponse.json(
				{
					data: null,
					message: "Configuração RFM não encontrada para esta organização.",
				},
				{ status: 404 },
			);
		}
		console.log(rfmConfigReturn?.organizacao);

		const rows = await db
			.select({
				clienteId: sales.clienteId,
				totalPurchases: sql<number>`sum(${sales.valorTotal})`,
				purchaseCount: sql<number>`count(${sales.id})`,
				lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
				firstPurchaseDate: sql<Date>`min(${sales.dataVenda})`,
			})
			.from(sales)
			.where(
				and(
					eq(sales.organizacaoId, organizationId),
					isNotNull(sales.clienteId),
					isNotNull(sales.dataVenda),
					gte(sales.dataVenda, intervalStart),
					lte(sales.dataVenda, intervalEnd),
					eq(sales.natureza, "SN01"),
				),
			)
			.groupBy(sales.clienteId);

		const clientsRfm = (rows as TMetricRow[]).map((row) => {
			const recencyDays = dayjs().diff(dayjs(row.lastPurchaseDate), "days");
			const frequency = toNumber(row.purchaseCount);
			const monetary = toNumber(row.totalPurchases);

			return {
				clienteId: row.clienteId,
				recencyDays,
				frequency,
				monetary,
				firstPurchaseDate: row.firstPurchaseDate,
				lastPurchaseDate: row.lastPurchaseDate,
			};
		});

		const recencyValues = clientsRfm.map((client) => client.recencyDays);
		const frequencyValues = clientsRfm.map((client) => client.frequency);
		const monetaryValues = clientsRfm.map((client) => client.monetary);

		const clientsWithSuggestedScores = clientsRfm.map((client) => {
			const recencyScore = scoreByConfig(client.recencyDays, rfmConfig.recencia);
			const frequencyScore = scoreByConfig(client.frequency, rfmConfig.frequencia);
			const monetaryScore = scoreByConfig(client.monetary, rfmConfig.monetario);

			return {
				...client,
				scores: {
					recency: recencyScore,
					frequency: frequencyScore,
					monetary: monetaryScore,
				},
				label: getLocalRFMLabel({
					recency: recencyScore,
					frequency: frequencyScore,
					monetary: monetaryScore,
				}),
			};
		});

		const labelDistribution = clientsWithSuggestedScores.reduce<Record<string, number>>((acc, client) => {
			acc[client.label] = (acc[client.label] ?? 0) + 1;
			return acc;
		}, {});

		return NextResponse.json({
			data: {
				organizationId,
				period: {
					months: analysisMonths,
					start: intervalStart,
					end: intervalEnd,
				},
				totals: {
					identifiedClientsWithSales: clientsRfm.length,
				},
				metrics: {
					recencyDays: summarizeMetric(recencyValues),
					frequency: summarizeMetric(frequencyValues),
					monetary: summarizeMetric(monetaryValues),
				},
				suggestedConfigByQuintiles: {
					identificador: "CONFIG_RFM",
					recencia: buildSuggestedRanges(recencyValues, false),
					frequencia: buildSuggestedRanges(frequencyValues, true),
					monetario: buildSuggestedRanges(monetaryValues, true),
				},
				organizationRfmConfigUsed: rfmConfig,
				suggestedLabelDistribution: labelDistribution,
				sample: clientsWithSuggestedScores.slice(0, 50),
				notes: [
					"Recência usa dias desde a última compra: quanto menor, melhor.",
					"Frequência usa quantidade de compras no período: quanto maior, melhor.",
					"Monetário usa valor total comprado no período: quanto maior, melhor.",
					"Os scores e labels foram calculados usando a configuração CONFIG_RFM salva na organização.",
					"Vendas consideradas seguem o mesmo filtro do cron RFM atual: natureza = SN01, cliente identificado e data_venda dentro do período.",
				],
			},
			message: "RFM calculado com sucesso usando a configuração da organização.",
		});
	},
});
