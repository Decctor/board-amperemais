import { db } from "@/services/drizzle";
import { getIdentificationRate, getRepurchaseCycle, getSegmentDistribution } from "@/lib/commercial-analysis";
import {
	campaignConversions,
	campaigns,
	interactions,
	organizations,
	whatsappConnectionPhones,
	whatsappConnections,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, countDistinct, eq, gte, lte, sum } from "drizzle-orm";
import { getWhatsappTemplatePlainText } from "./template-text";

export type TMarketingCampaignsPerformanceContext = Awaited<ReturnType<typeof getCampaignsPerformanceContext>>;

export async function getCampaignsPerformanceContext(orgId: string) {
	const last30DaysPeriod = {
		start: dayjs().subtract(30, "days").startOf("day").toDate(),
		end: dayjs().endOf("day").toDate(),
	};

	const [
		organization,
		availableWhatsappPhones,
		campaignsResult,
		interactionsGroupedByCampaignResult,
		conversionsGroupedByCampaignResult,
		identificationRate,
		repurchaseCycle,
		segmentDistribution,
	] = await Promise.all([
		db.query.organizations.findFirst({
			where: eq(organizations.id, orgId),
			columns: {
				id: true,
				nome: true,
				atuacaoNicho: true,
			},
		}),
		db
			.select({
				id: whatsappConnectionPhones.id,
				nome: whatsappConnectionPhones.nome,
				numero: whatsappConnectionPhones.numero,
				permitirAtendimentoIa: whatsappConnectionPhones.permitirAtendimentoIa,
				conexaoId: whatsappConnections.id,
				tipoConexao: whatsappConnections.tipoConexao,
			})
			.from(whatsappConnectionPhones)
			.innerJoin(whatsappConnections, eq(whatsappConnections.id, whatsappConnectionPhones.conexaoId))
			.where(eq(whatsappConnections.organizacaoId, orgId)),
		db.query.campaigns.findMany({
			where: eq(campaigns.organizacaoId, orgId),
			with: {
				segmentacoes: true,
				whatsappTemplate: true,
				whatsappConexaoTelefone: true,
			},
		}),
		db
			.select({
				campaignId: interactions.campanhaId,
				total: count(interactions.id),
				clientesAlcancados: countDistinct(interactions.clienteId),
			})
			.from(interactions)
			.where(
				and(
					eq(interactions.organizacaoId, orgId),
					eq(interactions.tipo, "ENVIO-MENSAGEM"),
					gte(interactions.dataInsercao, last30DaysPeriod.start),
					lte(interactions.dataInsercao, last30DaysPeriod.end),
				),
			)
			.groupBy(interactions.campanhaId),
		db
			.select({
				campaignId: campaignConversions.campanhaId,
				totalConversionsQuantity: count(campaignConversions.id),
				totalConversionsRevenue: sum(campaignConversions.atribuicaoReceita),
			})
			.from(campaignConversions)
			.where(
				and(
					eq(campaignConversions.organizacaoId, orgId),
					gte(campaignConversions.dataConversao, last30DaysPeriod.start),
					lte(campaignConversions.dataConversao, last30DaysPeriod.end),
				),
			)
			.groupBy(campaignConversions.campanhaId),
		getIdentificationRate({ organizacaoId: orgId }),
		getRepurchaseCycle({ organizacaoId: orgId }),
		getSegmentDistribution({ organizacaoId: orgId }),
	]);

	const interactionsGroupedByCampaignMap = new Map(interactionsGroupedByCampaignResult.map((item) => [item.campaignId, item]));
	const conversionsGroupedByCampaignMap = new Map(conversionsGroupedByCampaignResult.map((item) => [item.campaignId, item]));

	const campaignsEnriched = campaignsResult.map((campaign) => {
		const interactionStats = interactionsGroupedByCampaignMap.get(campaign.id) ?? {
			total: 0,
			clientesAlcancados: 0,
		};
		const conversionStats = conversionsGroupedByCampaignMap.get(campaign.id) ?? {
			totalConversionsQuantity: 0,
			totalConversionsRevenue: 0,
		};

		const conversionRate = interactionStats.total > 0 ? (conversionStats.totalConversionsQuantity / interactionStats.total) * 100 : 0;

		return {
			id: campaign.id,
			titulo: campaign.titulo,
			descricao: campaign.descricao,
			gatilhoTipo: campaign.gatilhoTipo,
			ativo: campaign.ativo,
			segmentacoes: campaign.segmentacoes.map((segmentation) => segmentation.segmentacao),
			whatsappConexaoTelefone: campaign.whatsappConexaoTelefone
				? {
						id: campaign.whatsappConexaoTelefone.id,
						nome: campaign.whatsappConexaoTelefone.nome,
						numero: campaign.whatsappConexaoTelefone.numero,
					}
				: null,
			whatsappTemplate: campaign.whatsappTemplate
				? {
						id: campaign.whatsappTemplate.id,
						nome: campaign.whatsappTemplate.nome,
						texto: getWhatsappTemplatePlainText(campaign.whatsappTemplate.conteudo),
					}
				: null,
			stats: {
				interacoes: interactionStats.total,
				clientesAlcancados: interactionStats.clientesAlcancados,
				conversoes: conversionStats.totalConversionsQuantity,
				taxaConversao: Math.round(conversionRate * 100) / 100,
				receitaTotal: Number(conversionStats.totalConversionsRevenue ?? 0),
			},
		};
	});

	const campaignsTotals = {
		campanhas: campaignsResult.length,
		campanhasAtivas: campaignsResult.filter((campaign) => campaign.ativo).length,
		interacoes: interactionsGroupedByCampaignResult.reduce((acc, curr) => acc + curr.total, 0),
		conversoes: conversionsGroupedByCampaignResult.reduce((acc, curr) => acc + curr.totalConversionsQuantity, 0),
		receitaTotal: conversionsGroupedByCampaignResult.reduce((acc, curr) => acc + Number(curr.totalConversionsRevenue ?? 0), 0),
	};

	return {
		organizacao: organization
			? {
					id: organization.id,
					nome: organization.nome,
					nicho: organization.atuacaoNicho,
				}
			: null,
		periodoAnalise: {
			inicio: last30DaysPeriod.start.toISOString(),
			fim: last30DaysPeriod.end.toISOString(),
		},
		// Headline de diagnóstico comercial (últimos 12 meses), para o analista já
		// receber a régua do negócio sem gastar tool calls. Cada métrica traz seu
		// grau de suficiência para uso sob dado imperfeito.
		diagnosticoComercial: {
			taxaIdentificacao: identificationRate,
			cicloRecompra: repurchaseCycle,
			segmentos: segmentDistribution,
		},
		telefonesWhatsappDisponiveis: availableWhatsappPhones.map((phone) => ({
			id: phone.id,
			nome: phone.nome,
			numero: phone.numero,
			tipoConexao: phone.tipoConexao,
			permitirAtendimentoIa: phone.permitirAtendimentoIa,
		})),
		estatisticas: campaignsTotals,
		campanhas: campaignsEnriched,
	};
}
