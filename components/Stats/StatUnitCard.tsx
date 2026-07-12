"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { formatDateAsLocale, formatDecimalPlaces } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { History, TrendingDown, TrendingUp } from "lucide-react";

type TStat = {
	value: number;
	format: (n: number) => string;
};
/**
 * Escopo temporal ACUMULADO: a métrica é um retrato da base até uma data (snapshot),
 * e não do período filtrado na página. Cards de período não recebem tag — o filtro de
 * datas acima deles já é a explicação; sinalizamos apenas a exceção.
 */
type TTemporalScope = {
	tipo: "ACUMULADO";
	ate?: Date | string | null;
};
type StatUnitCardProps = {
	title: string;
	subtitle?: string;
	icon: React.ReactNode;
	current: TStat;
	previous?: TStat;
	previousLabel?: string;
	lowerIsBetter?: boolean;
	className?: string;
	footer?: React.ReactNode;
	temporalScope?: TTemporalScope;
};
export default function StatUnitCard({
	title,
	subtitle,
	icon,
	current,
	previous,
	previousLabel = "NO MÊS ANTERIOR",
	lowerIsBetter,
	className,
	footer,
	temporalScope,
}: StatUnitCardProps) {
	const { colors } = useOrgColors();
	const showComparison = !!previous;
	function getChange(current: TStat, previous?: TStat) {
		if (!previous) return 0;
		if (previous.value === 0) {
			if (current.value === 0) return 0;
			return 100;
		}
		return ((current.value - previous.value) / Math.abs(previous.value)) * 100;
	}
	const change = getChange(current, previous);

	const isGood = lowerIsBetter ? change < 0 : change > 0;
	const isNeutral = change === 0;
	const changeAbs = Math.abs(change);

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs", className)}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<h1 className="text-xs font-medium tracking-tight uppercase">{title}</h1>
						{temporalScope ? (
							<span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">
								<History className="h-2.5 w-2.5 min-h-2.5 min-w-2.5" />
								{temporalScope.ate ? `Até ${formatDateAsLocale(temporalScope.ate)}` : "Vida toda"}
							</span>
						) : null}
					</div>
					{subtitle && <p className="text-[0.65rem] text-muted-foreground">{subtitle}</p>}
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex min-h-[22px] items-center">
						{showComparison && !isNeutral ? (
							<div
								className={cn(
									"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold ",
									isGood ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700",
								)}
							>
								{isGood ? <TrendingUp className="h-3 min-h-3 w-3 min-w-3" /> : <TrendingDown className="h-3 min-h-3 w-3 min-w-3" />}
								{formatDecimalPlaces(changeAbs)}%
							</div>
						) : null}
					</div>
					{icon}
				</div>
			</div>
			<div className="flex w-full flex-col gap-1">
				<div className="text-2xl font-bold" style={{ color: colors.secondary }}>
					{current.format(current.value)}
				</div>
				<p
					className={cn("text-muted-foreground min-h-4 text-xs tracking-tight", !showComparison && "invisible")}
					aria-hidden={!showComparison}
				>
					{showComparison ? `${previousLabel}: ${previous.format(previous.value)}` : "\u00A0"}
				</p>
			</div>
			{footer ? <div className="w-full">{footer}</div> : null}
		</div>
	);
}
