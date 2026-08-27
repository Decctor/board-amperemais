"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: components/Stats/Blocks/CampaignQualityCardsBlock.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem hooks de dados e sem os estados de loading/vazio.
 * Recebe os números por prop, a partir de `_fixtures/campaign-stats.ts`.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import type { TGetConversionQualityOutput } from "@/app/api/campaigns/stats/conversion-quality/route";
import { formatDecimalPlaces } from "@/lib/formatting";
import { BadgeDollarSign, Clock, RefreshCw, Zap } from "lucide-react";
import StatUnitCard from "@/components/Stats/StatUnitCard";

type CampaignQualityCardsBlockProps = {
	quality: TGetConversionQualityOutput["data"];
};

export function CampaignQualityCardsBlock({ quality }: CampaignQualityCardsBlockProps) {
	const diasAntecipados = quality?.impactoFrequencia.mediasDiasAntecipados ?? 0;
	const upliftTicket = quality?.impactoMonetario.deltaMonetarioPercentualMedio ?? 0;
	const recuperados = quality?.distribuicaoTipos.find((t) => t.tipo === "REATIVACAO")?.quantidade ?? 0;
	const tempoConversao = quality?.resumo.avgTempoConversaoHoras ?? 0;

	return (
		<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
			<StatUnitCard
				title="ANTECIPAÇÃO DO CICLO"
				current={{ value: diasAntecipados, format: (n) => `${n > 0 ? "+" : ""}${formatDecimalPlaces(n)} dias` }}
				icon={<Zap className="w-4 h-4" />}
				className="w-full lg:w-1/4"
			/>
			<StatUnitCard
				title="AUMENTO NO TICKET"
				current={{ value: upliftTicket, format: (n) => `${n > 0 ? "+" : ""}${formatDecimalPlaces(n)}%` }}
				icon={<BadgeDollarSign className="w-4 h-4" />}
				className="w-full lg:w-1/4"
			/>
			<StatUnitCard
				title="CLIENTES RECUPERADOS"
				current={{ value: recuperados, format: (n) => formatDecimalPlaces(n) }}
				icon={<RefreshCw className="w-4 h-4" />}
				className="w-full lg:w-1/4"
			/>
			<StatUnitCard
				title="TEMPO P/ CONVERSÃO"
				current={{ value: tempoConversao, format: (n) => `${formatDecimalPlaces(n)}h` }}
				icon={<Clock className="w-4 h-4" />}
				className="w-full lg:w-1/4"
			/>
		</div>
	);
}
