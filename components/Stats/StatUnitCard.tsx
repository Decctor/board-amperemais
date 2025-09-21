import { formatDecimalPlaces } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

type TStat = {
	value: number;
	format: (n: number) => string;
};
type StatUnitCardProps = {
	title: string;
	icon: React.ReactNode;
	current: TStat;
	previous?: TStat;
	lowerIsBetter?: boolean;
	className?: string;
};
export default function StatUnitCard({ title, icon, current, previous, lowerIsBetter, className }: StatUnitCardProps) {
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
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs", className)}>
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">{title}</h1>
				<div className="flex items-center gap-2">
					{showComparison && !isNeutral && (
						<div
							className={cn(
								"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold ",
								isGood ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700",
							)}
						>
							{isGood ? <TrendingUp className="h-3 min-h-3 w-3 min-w-3" /> : <TrendingDown className="h-3 min-h-3 w-3 min-w-3" />}
							{formatDecimalPlaces(changeAbs)}%
						</div>
					)}
					{icon}
				</div>
			</div>
			<div className="flex w-full flex-col">
				<div className="text-2xl font-bold text-[#15599a] dark:text-[#fead61]">{current.format(current.value)}</div>
				{showComparison ? <p className="text-primary/60 text-xs tracking-tight">NO MÊS ANTERIOR: {previous?.format(previous?.value || 0)}</p> : null}
			</div>
		</div>
	);
}
