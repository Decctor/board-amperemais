import { CAMPAIGN_SENT_INTERACTION_STATUSES } from "@/lib/campaigns/utils";
import type { TConversionTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { campaignConversions, campaigns, interactions } from "@/services/drizzle/schema";
import { and, avg, count, countDistinct, desc, eq, gte, isNotNull, inArray, lte, sql, sum } from "drizzle-orm";

type CampaignPeriodParams = {
	after: Date;
	before: Date;
	comparisonAfter: Date;
	comparisonBefore: Date;
	organizacaoId: string;
};

type CampaignWindowParams = {
	after: Date;
	before: Date;
	organizacaoId: string;
};

export type CampaignConversionTypeBreakdown = {
	tipo: TConversionTypeEnum;
	label: string;
	quantidade: number;
	receita: number;
	percentual: number;
	/** Whether this type represents a high-value retention outcome (recovery / acceleration). */
	destaque: boolean;
};

export type CampaignTopItem = {
	campanhaId: string;
	titulo: string;
	conversoes: number;
	receita: number;
};

export type CampaignReportStatsResult = {
	receitaAtribuida: { atual: number; anterior: number | undefined };
	conversoes: { atual: number; anterior: number | undefined };
	mensagensEnviadas: { atual: number; anterior: number | undefined };
	taxaConversao: { atual: number; anterior: number | undefined };
	clientesAlcancados: number;
	clientesImpactados: number;
	clientesRecuperados: number;
	clientesAcelerados: number;
	ticketMedioConversao: number;
	campanhasAtivas: number;
	distribuicaoTipos: CampaignConversionTypeBreakdown[];
	topCampanhas: CampaignTopItem[];
	impactoFrequencia: {
		diasAntecipadosMedio: number;
		totalAceleradas: number;
		confiavel: boolean;
	};
	impactoMonetario: {
		aumentoPercentualMedio: number;
		totalAcimaTicket: number;
	};
};

const CONVERSION_TYPE_LABELS: Record<TConversionTypeEnum, string> = {
	AQUISICAO: "Aquisição",
	REATIVACAO: "Reativação",
	ACELERACAO: "Aceleração",
	REGULAR: "Regular",
	ATRASADA: "Atrasada",
};

/** Display order: retention wins first, then volume, then the slow tail. */
const CONVERSION_TYPE_ORDER: TConversionTypeEnum[] = ["REATIVACAO", "ACELERACAO", "AQUISICAO", "REGULAR", "ATRASADA"];
const HIGHLIGHT_TYPES: ReadonlySet<TConversionTypeEnum> = new Set<TConversionTypeEnum>(["REATIVACAO", "ACELERACAO"]);

function toNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Attributed revenue, conversion count and campaign messages sent for a single window. Used for both
 * the current period and the comparison period. Mirrors the formulas in /api/campaigns/stats/*:
 * conversions are counted by `dataConversao`; messages by `dataInsercao` over delivered statuses.
 */
async function getCampaignCoreMetrics({ after, before, organizacaoId }: CampaignWindowParams) {
	const [conversionsRow] = await db
		.select({
			receita: sum(campaignConversions.atribuicaoReceita),
			conversoes: count(campaignConversions.id),
		})
		.from(campaignConversions)
		.where(
			and(
				eq(campaignConversions.organizacaoId, organizacaoId),
				gte(campaignConversions.dataConversao, after),
				lte(campaignConversions.dataConversao, before),
			),
		);

	const [messagesRow] = await db
		.select({ total: count(interactions.id) })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizacaoId),
				eq(interactions.tipo, "ENVIO-MENSAGEM"),
				inArray(interactions.statusEnvio, [...CAMPAIGN_SENT_INTERACTION_STATUSES]),
				gte(interactions.dataInsercao, after),
				lte(interactions.dataInsercao, before),
			),
		);

	const receita = toNumber(conversionsRow?.receita);
	const conversoes = toNumber(conversionsRow?.conversoes);
	const mensagens = toNumber(messagesRow?.total);
	const taxaConversao = mensagens > 0 ? (conversoes / mensagens) * 100 : 0;

	return { receita, conversoes, mensagens, taxaConversao };
}

export async function getCampaignReportStats({
	after,
	before,
	comparisonAfter,
	comparisonBefore,
	organizacaoId,
}: CampaignPeriodParams): Promise<CampaignReportStatsResult> {
	const periodConditions = [
		eq(campaignConversions.organizacaoId, organizacaoId),
		gte(campaignConversions.dataConversao, after),
		lte(campaignConversions.dataConversao, before),
	];

	const [current, previous, typeRows, clientesRows, frequencyRows, monetaryRows, activeCampaignsRows, reachRows, topRows] = await Promise.all([
		getCampaignCoreMetrics({ after, before, organizacaoId }),
		getCampaignCoreMetrics({ after: comparisonAfter, before: comparisonBefore, organizacaoId }),
		db
			.select({
				tipo: campaignConversions.tipoConversao,
				quantidade: count(campaignConversions.id),
				receita: sum(campaignConversions.atribuicaoReceita),
			})
			.from(campaignConversions)
			.where(and(...periodConditions, isNotNull(campaignConversions.tipoConversao)))
			.groupBy(campaignConversions.tipoConversao),
		db
			.select({
				impactados: countDistinct(campaignConversions.clienteId),
				ticketMedio: avg(campaignConversions.vendaValor),
			})
			.from(campaignConversions)
			.where(and(...periodConditions)),
		db
			.select({
				totalAceleradas: sql<number>`COUNT(*) FILTER (WHERE ${campaignConversions.deltaFrequencia} > 0)`,
				diasAntecipadosMedio: sql<number>`AVG(${campaignConversions.deltaFrequencia}) FILTER (WHERE ${campaignConversions.deltaFrequencia} > 0)`,
			})
			.from(campaignConversions)
			.where(and(...periodConditions, eq(campaignConversions.cicloCompraConfiavel, true), isNotNull(campaignConversions.deltaFrequencia))),
		db
			.select({
				totalAcimaTicket: sql<number>`COUNT(*) FILTER (WHERE ${campaignConversions.deltaMonetarioAbsoluto} > 0)`,
				aumentoPercentualMedio: sql<number>`AVG(${campaignConversions.deltaMonetarioPercentual}) FILTER (WHERE ${campaignConversions.deltaMonetarioPercentual} > 0)`,
			})
			.from(campaignConversions)
			.where(and(...periodConditions, isNotNull(campaignConversions.deltaMonetarioPercentual))),
		db
			.select({ total: count(campaigns.id) })
			.from(campaigns)
			.where(and(eq(campaigns.organizacaoId, organizacaoId), eq(campaigns.ativo, true))),
		db
			.select({ total: countDistinct(interactions.clienteId) })
			.from(interactions)
			.where(
				and(
					eq(interactions.organizacaoId, organizacaoId),
					eq(interactions.tipo, "ENVIO-MENSAGEM"),
					inArray(interactions.statusEnvio, [...CAMPAIGN_SENT_INTERACTION_STATUSES]),
					gte(interactions.dataInsercao, after),
					lte(interactions.dataInsercao, before),
				),
			),
		db
			.select({
				campanhaId: campaigns.id,
				titulo: campaigns.titulo,
				conversoes: count(campaignConversions.id),
				receita: sum(campaignConversions.atribuicaoReceita),
			})
			.from(campaignConversions)
			.innerJoin(campaigns, eq(campaignConversions.campanhaId, campaigns.id))
			.where(and(...periodConditions))
			.groupBy(campaigns.id, campaigns.titulo)
			.orderBy(desc(sql`sum(${campaignConversions.atribuicaoReceita})`))
			.limit(4),
	]);

	const clientesRow = clientesRows[0];
	const frequencyRow = frequencyRows[0];
	const monetaryRow = monetaryRows[0];

	const typeMap = new Map<TConversionTypeEnum, { quantidade: number; receita: number }>();
	for (const row of typeRows) {
		if (!row.tipo) continue;
		typeMap.set(row.tipo as TConversionTypeEnum, {
			quantidade: toNumber(row.quantidade),
			receita: toNumber(row.receita),
		});
	}

	const totalTipos = Array.from(typeMap.values()).reduce((acc, item) => acc + item.quantidade, 0);

	const distribuicaoTipos: CampaignConversionTypeBreakdown[] = CONVERSION_TYPE_ORDER.filter((tipo) => (typeMap.get(tipo)?.quantidade ?? 0) > 0).map(
		(tipo) => {
			const data = typeMap.get(tipo) ?? { quantidade: 0, receita: 0 };
			return {
				tipo,
				label: CONVERSION_TYPE_LABELS[tipo],
				quantidade: data.quantidade,
				receita: data.receita,
				percentual: totalTipos > 0 ? (data.quantidade / totalTipos) * 100 : 0,
				destaque: HIGHLIGHT_TYPES.has(tipo),
			};
		},
	);

	const topCampanhas: CampaignTopItem[] = topRows
		.filter((row) => row.campanhaId)
		.map((row) => ({
			campanhaId: row.campanhaId as string,
			titulo: row.titulo ?? "Campanha",
			conversoes: toNumber(row.conversoes),
			receita: toNumber(row.receita),
		}));

	const totalAceleradas = toNumber(frequencyRow?.totalAceleradas);

	return {
		receitaAtribuida: { atual: current.receita, anterior: previous.receita },
		conversoes: { atual: current.conversoes, anterior: previous.conversoes },
		mensagensEnviadas: { atual: current.mensagens, anterior: previous.mensagens },
		taxaConversao: { atual: current.taxaConversao, anterior: previous.taxaConversao },
		clientesAlcancados: toNumber(reachRows[0]?.total),
		clientesImpactados: toNumber(clientesRow?.impactados),
		clientesRecuperados: typeMap.get("REATIVACAO")?.quantidade ?? 0,
		clientesAcelerados: typeMap.get("ACELERACAO")?.quantidade ?? 0,
		ticketMedioConversao: toNumber(clientesRow?.ticketMedio),
		campanhasAtivas: toNumber(activeCampaignsRows[0]?.total),
		distribuicaoTipos,
		topCampanhas,
		impactoFrequencia: {
			diasAntecipadosMedio: toNumber(frequencyRow?.diasAntecipadosMedio),
			totalAceleradas,
			confiavel: totalAceleradas > 0,
		},
		impactoMonetario: {
			aumentoPercentualMedio: toNumber(monetaryRow?.aumentoPercentualMedio),
			totalAcimaTicket: toNumber(monetaryRow?.totalAcimaTicket),
		},
	};
}
