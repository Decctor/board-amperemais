import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { type TAnalysisSufficiency, buildSufficiency } from "./types";

export type TIdentificationRateAnalysis = {
	periodoMeses: number;
	totalVendas: number;
	vendasIdentificadas: number;
	taxaIdentificacao: number; // 0-100, sobre quantidade de vendas
	receitaTotal: number;
	receitaIdentificada: number;
	taxaIdentificacaoReceita: number; // 0-100, sobre faturamento
	ticketMedioIdentificado: number;
	ticketMedioAnonimo: number;
	indiceViesSelecao: number | null; // ticket identificado / ticket anônimo
	alertas: string[];
	suficiencia: TAnalysisSufficiency;
};

/**
 * Taxa de identificação de cliente nas vendas — a métrica-mãe do cenário de
 * dado imperfeito. Todo o RFM/CLV/recompra é cego para vendas sem `clienteId`,
 * então uma taxa baixa significa que a base analítica representa só uma fração
 * (e geralmente enviesada, pois quem se identifica tende a ser mais fiel) do
 * negócio real. Por isso também medimos o viés de seleção comparando o ticket
 * médio de vendas identificadas vs. anônimas.
 */
export async function getIdentificationRate({
	organizacaoId,
	months = 12,
}: {
	organizacaoId: string;
	months?: number;
}): Promise<TIdentificationRateAnalysis> {
	const intervalStart = dayjs().subtract(months, "month").startOf("day").toDate();
	const intervalEnd = dayjs().endOf("day").toDate();

	const [row] = await db
		.select({
			totalVendas: sql<number>`count(*)`,
			vendasIdentificadas: sql<number>`count(${sales.clienteId})`,
			receitaTotal: sql<number>`coalesce(sum(${sales.valorTotal}), 0)`,
			receitaIdentificada: sql<number>`coalesce(sum(${sales.valorTotal}) filter (where ${sales.clienteId} is not null), 0)`,
			ticketMedioIdentificado: sql<number>`coalesce(avg(${sales.valorTotal}) filter (where ${sales.clienteId} is not null), 0)`,
			ticketMedioAnonimo: sql<number>`coalesce(avg(${sales.valorTotal}) filter (where ${sales.clienteId} is null), 0)`,
		})
		.from(sales)
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				eq(sales.natureza, "SN01"),
				gte(sales.dataVenda, intervalStart),
				lte(sales.dataVenda, intervalEnd),
			),
		);

	const totalVendas = Number(row?.totalVendas ?? 0);
	const vendasIdentificadas = Number(row?.vendasIdentificadas ?? 0);
	const receitaTotal = Number(row?.receitaTotal ?? 0);
	const receitaIdentificada = Number(row?.receitaIdentificada ?? 0);
	const ticketMedioIdentificado = Number(row?.ticketMedioIdentificado ?? 0);
	const ticketMedioAnonimo = Number(row?.ticketMedioAnonimo ?? 0);

	const taxaIdentificacao = totalVendas > 0 ? (vendasIdentificadas / totalVendas) * 100 : 0;
	const taxaIdentificacaoReceita = receitaTotal > 0 ? (receitaIdentificada / receitaTotal) * 100 : 0;
	const indiceViesSelecao = ticketMedioAnonimo > 0 ? ticketMedioIdentificado / ticketMedioAnonimo : null;

	const alertas: string[] = [];
	if (totalVendas > 0 && taxaIdentificacao < 30) {
		alertas.push(
			"Taxa de identificação abaixo de 30%: a análise de clientes enxerga uma fração pequena do negócio. Priorizar captura de identidade no PDV tende a gerar mais retorno do que qualquer ajuste fino de campanha.",
		);
	}
	if (indiceViesSelecao !== null && (indiceViesSelecao >= 1.2 || indiceViesSelecao <= 0.8)) {
		alertas.push(
			`Viés de seleção relevante: o ticket de vendas identificadas é ${indiceViesSelecao.toFixed(2)}x o das anônimas. Tamanhos absolutos de segmento estão distorcidos; confie mais em tendências dentro dos identificados do que em proporções da base toda.`,
		);
	}

	return {
		periodoMeses: months,
		totalVendas,
		vendasIdentificadas,
		taxaIdentificacao: Math.round(taxaIdentificacao * 100) / 100,
		receitaTotal,
		receitaIdentificada,
		taxaIdentificacaoReceita: Math.round(taxaIdentificacaoReceita * 100) / 100,
		ticketMedioIdentificado: Math.round(ticketMedioIdentificado * 100) / 100,
		ticketMedioAnonimo: Math.round(ticketMedioAnonimo * 100) / 100,
		indiceViesSelecao: indiceViesSelecao !== null ? Math.round(indiceViesSelecao * 100) / 100 : null,
		alertas,
		suficiencia: buildSufficiency(totalVendas),
	};
}
