"use client";
import type { TGetConversionQualityOutput } from "@/app/api/campaigns/stats/conversion-quality/route";
import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { formatDecimalPlaces } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, Clock, RefreshCw, Zap } from "lucide-react";
import StatUnitCard from "../StatUnitCard";

type CampaignQualityCardsBlockProps = {
	quality: TGetConversionQualityOutput["data"] | undefined;
	isLoading: boolean;
};

type DeltaCardProps = {
	label: string;
	value: string;
	interpretation: string;
	isPositive: boolean;
	icon: React.ReactNode;
};

function DeltaCard({ label, value, interpretation, isPositive, icon }: DeltaCardProps) {
	const { colors } = useOrgColors();

	return (
		<div className="flex flex-1 min-w-[160px] flex-col gap-2 rounded-xl border border-border bg-card px-4 py-4 shadow-2xs">
			<div className="flex items-center gap-2 text-muted-foreground">
				{icon}
				<span className="text-xs font-bold uppercase tracking-wide">{label}</span>
			</div>
			<div className={cn("text-2xl font-bold tabular-nums leading-none", isPositive ? "text-[#16a34a]" : "text-[#ef4444]")}>{value}</div>
			<p className="text-[0.65rem] text-muted-foreground leading-tight">{interpretation}</p>
		</div>
	);
}

export function CampaignQualityCardsBlock({ quality, isLoading }: CampaignQualityCardsBlockProps) {
	if (isLoading) {
		return (
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="flex-1 min-w-[160px] h-[110px] rounded-xl border bg-muted/40 animate-pulse" />
				))}
			</div>
		);
	}

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
