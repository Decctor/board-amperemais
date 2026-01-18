import type { DBTransaction } from "@/services/drizzle";
import { campaignConversions, campaigns, interactions, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, isNotNull, lte } from "drizzle-orm";

interface AttributionParams {
	vendaId: string;
	clienteId: string;
	organizacaoId: string;
	valorVenda: number;
	dataVenda: Date;
}

interface AttributionResult {
	interactionId: string;
	campanhaId: string;
	peso: number;
	receita: number;
	dataInteracao: Date;
	tempoMinutos: number;
}

/**
 * Calculate last-touch attribution - gives 100% credit to the last campaign interaction before the sale
 */
function calculateLastTouchAttribution(
	eligibleInteractions: Array<{
		id: string;
		campanhaId: string | null;
		dataExecucao: Date | null;
	}>,
	valorVenda: number,
	dataVenda: Date,
): AttributionResult[] {
	// Sort by execution date descending, take the last one (most recent before sale)
	const sorted = eligibleInteractions
		.filter((i) => i.campanhaId && i.dataExecucao)
		.sort((a, b) => new Date(b.dataExecucao!).getTime() - new Date(a.dataExecucao!).getTime());

	const last = sorted[0];
	if (!last || !last.campanhaId || !last.dataExecucao) {
		return [];
	}

	return [
		{
			interactionId: last.id,
			campanhaId: last.campanhaId,
			peso: 1.0,
			receita: valorVenda,
			dataInteracao: last.dataExecucao,
			tempoMinutos: Math.floor((dataVenda.getTime() - new Date(last.dataExecucao).getTime()) / 60000),
		},
	];
}

/**
 * Process conversion attribution for a sale
 * Looks back at all campaign interactions the client received within the attribution window
 * and attributes the sale to the last campaign that contacted them (last-touch model)
 */
export async function processConversionAttribution(tx: DBTransaction, params: AttributionParams): Promise<void> {
	const { vendaId, clienteId, organizacaoId, valorVenda, dataVenda } = params;

	// 1. Find all campaigns with their attribution settings for this organization
	const allCampaigns = await tx.query.campaigns.findMany({
		where: eq(campaigns.organizacaoId, organizacaoId),
		columns: {
			id: true,
			atribuicaoJanelaDias: true,
			atribuicaoModelo: true,
		},
	});

	const campaignSettingsMap = new Map(
		allCampaigns.map((c) => [
			c.id,
			{
				windowDays: c.atribuicaoJanelaDias ?? 14,
				model: c.atribuicaoModelo ?? "LAST_TOUCH",
			},
		]),
	);

	// 2. Find eligible interactions (executed before sale, type ENVIO-MENSAGEM)
	const eligibleInteractions = await tx.query.interactions.findMany({
		where: and(
			eq(interactions.clienteId, clienteId),
			eq(interactions.organizacaoId, organizacaoId),
			eq(interactions.tipo, "ENVIO-MENSAGEM"),
			isNotNull(interactions.dataExecucao),
			lte(interactions.dataExecucao, dataVenda),
		),
		with: {
			campanha: true,
		},
	});

	// 3. Filter by each campaign's attribution window
	const withinWindowInteractions = eligibleInteractions.filter((interaction) => {
		if (!interaction.campanhaId || !interaction.dataExecucao) return false;

		const campaignSettings = campaignSettingsMap.get(interaction.campanhaId);
		const windowDays = campaignSettings?.windowDays ?? 14;
		const windowStart = dayjs(dataVenda).subtract(windowDays, "day").toDate();

		return new Date(interaction.dataExecucao) >= windowStart;
	});

	// 4. If no eligible interactions, mark sale as processed but not applicable
	if (withinWindowInteractions.length === 0) {
		await tx
			.update(sales)
			.set({
				atribuicaoProcessada: true,
				atribuicaoAplicavel: false,
			})
			.where(eq(sales.id, vendaId));
		return;
	}

	// 5. Calculate attribution using last-touch model
	const attributions = calculateLastTouchAttribution(withinWindowInteractions, valorVenda, dataVenda);

	if (attributions.length === 0) {
		await tx
			.update(sales)
			.set({
				atribuicaoProcessada: true,
				atribuicaoAplicavel: false,
			})
			.where(eq(sales.id, vendaId));
		return;
	}

	// 6. Store attributions
	for (const attr of attributions) {
		const campaignSettings = campaignSettingsMap.get(attr.campanhaId);

		await tx.insert(campaignConversions).values({
			organizacaoId,
			vendaId,
			interacaoId: attr.interactionId,
			campanhaId: attr.campanhaId,
			clienteId,
			atribuicaoModelo: campaignSettings?.model ?? "LAST_TOUCH",
			atribuicaoPeso: attr.peso,
			atribuicaoReceita: attr.receita,
			dataInteracao: attr.dataInteracao,
			dataConversao: dataVenda,
			tempoParaConversaoMinutos: attr.tempoMinutos,
		});
	}

	// 7. Update sale with primary campaign (the one with highest weight, or first in last-touch)
	await tx
		.update(sales)
		.set({
			atribuicaoProcessada: true,
			atribuicaoAplicavel: true,
			atribuicaoCampanhaPrincipalId: attributions[0]?.campanhaId,
		})
		.where(eq(sales.id, vendaId));
}
