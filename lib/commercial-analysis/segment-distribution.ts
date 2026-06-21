import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { RFMLabels } from "@/utils/rfm";
import { eq, sql } from "drizzle-orm";
import { type TAnalysisSufficiency, buildSufficiency } from "./types";

// Segmentos cujo perfil pede ação de retenção/reativação (esfriando ou já frios).
const REACTIVATION_LABELS = new Set([
	"PRECISAM DE ATENÇÃO",
	"PRESTES A DORMIR",
	"EM RISCO",
	"NÃO PODE PERDÊ-LOS",
	"HIBERNANDO",
	"PERDIDOS",
]);

// Segmentos de topo, foco de fidelização e proteção.
const LOYAL_LABELS = new Set(["CAMPEÕES", "CLIENTES LEAIS", "POTENCIAIS CLIENTES LEAIS"]);

type TSegmentBucket = {
	label: string;
	clientes: number;
	percentual: number;
	receitaTotal: number;
};

export type TSegmentDistributionAnalysis = {
	totalClientes: number;
	naoClassificados: number; // sem rótulo RFM (cron ainda não rodou para eles)
	// Clientes sem nenhuma compra identificada no histórico. Importante: o cron
	// classifica esses clientes como PERDIDOS, inflando esse segmento. São uma
	// população distinta de "comprou e esfriou" e NÃO devem ser tratados como
	// alvo de reativação de recompra.
	clientesSemCompra: number;
	distribuicao: TSegmentBucket[];
	alvosReativacao: { clientes: number; receitaTotal: number };
	topoFiel: { clientes: number; receitaTotal: number };
	alertas: string[];
	suficiencia: TAnalysisSufficiency;
};

const RFM_LABEL_ORDER = RFMLabels.map((item) => item.text);

/**
 * Distribuição da base pelos segmentos RFM já calculados pelo cron e persistidos
 * em `clients.analiseRFMTitulo`. Dimensiona a oportunidade (quantos clientes e
 * quanta receita histórica há em cada segmento) e separa explicitamente os
 * clientes "nunca compraram" dos genuinamente esfriados, já que o cron colapsa
 * ambos em PERDIDOS.
 */
export async function getSegmentDistribution({
	organizacaoId,
}: {
	organizacaoId: string;
}): Promise<TSegmentDistributionAnalysis> {
	const rows = await db
		.select({
			label: clients.analiseRFMTitulo,
			clientes: sql<number>`count(*)`,
			semCompra: sql<number>`count(*) filter (where coalesce(${clients.metadataTotalCompras}, 0) = 0)`,
			receitaTotal: sql<number>`coalesce(sum(${clients.metadataValorTotalCompras}), 0)`,
		})
		.from(clients)
		.where(eq(clients.organizacaoId, organizacaoId))
		.groupBy(clients.analiseRFMTitulo);

	let totalClientes = 0;
	let naoClassificados = 0;
	let clientesSemCompra = 0;
	const alvosReativacao = { clientes: 0, receitaTotal: 0 };
	const topoFiel = { clientes: 0, receitaTotal: 0 };
	const countsByLabel = new Map<string, { clientes: number; receitaTotal: number }>();

	for (const row of rows) {
		const clientesCount = Number(row.clientes ?? 0);
		const receita = Number(row.receitaTotal ?? 0);
		totalClientes += clientesCount;
		clientesSemCompra += Number(row.semCompra ?? 0);

		if (!row.label) {
			naoClassificados += clientesCount;
			continue;
		}

		countsByLabel.set(row.label, { clientes: clientesCount, receitaTotal: receita });

		if (REACTIVATION_LABELS.has(row.label)) {
			alvosReativacao.clientes += clientesCount;
			alvosReativacao.receitaTotal += receita;
		}
		if (LOYAL_LABELS.has(row.label)) {
			topoFiel.clientes += clientesCount;
			topoFiel.receitaTotal += receita;
		}
	}

	const distribuicao: TSegmentBucket[] = RFM_LABEL_ORDER.map((label) => {
		const bucket = countsByLabel.get(label) ?? { clientes: 0, receitaTotal: 0 };
		return {
			label,
			clientes: bucket.clientes,
			percentual: totalClientes > 0 ? Math.round((bucket.clientes / totalClientes) * 10000) / 100 : 0,
			receitaTotal: Math.round(bucket.receitaTotal * 100) / 100,
		};
	});

	const alertas: string[] = [];
	const classificados = totalClientes - naoClassificados;
	if (classificados > 0 && clientesSemCompra / Math.max(classificados, 1) >= 0.4) {
		alertas.push(
			"40%+ da base nunca teve compra identificada e está concentrada em PERDIDOS. Separe esses clientes dos genuinamente esfriados antes de planejar reativação — eles pedem captura/ativação inicial, não recompra.",
		);
	}
	if (naoClassificados > 0 && naoClassificados / Math.max(totalClientes, 1) >= 0.2) {
		alertas.push(
			`${naoClassificados} clientes ainda sem rótulo RFM. A leitura de segmentos está parcial até o cron de RFM processar a base.`,
		);
	}

	return {
		totalClientes,
		naoClassificados,
		clientesSemCompra,
		distribuicao,
		alvosReativacao: {
			clientes: alvosReativacao.clientes,
			receitaTotal: Math.round(alvosReativacao.receitaTotal * 100) / 100,
		},
		topoFiel: {
			clientes: topoFiel.clientes,
			receitaTotal: Math.round(topoFiel.receitaTotal * 100) / 100,
		},
		alertas,
		suficiencia: buildSufficiency(classificados),
	};
}
