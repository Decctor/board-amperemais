import { cn } from "@/lib/utils";
import { GoalIcon } from "lucide-react";

type GoalTrackingBarProps = {
	valueGoal?: number;
	valueHit: number;
	formattedValueGoal?: string;
	formattedValueHit?: string;
	barHeight: string;
	/** Classe tailwind aplicada à barra (ex.: gradiente estático). */
	barClassName?: string;
	/** Estilo inline aplicado à barra (ex.: gradiente derivado das cores da organização). */
	barStyle?: React.CSSProperties;
};

function getPercentage({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
	if (!hit || hit === 0) return "0%";
	if (!goal && hit) return "100%";
	if (goal && !hit) return "0%";
	if (goal && hit) {
		const percentage = ((hit / goal) * 100).toFixed(2);
		return `${percentage}%`;
	}
}

function getWidth({ goal, hit }: { goal: number | undefined; hit: number | undefined }) {
	if (!hit || hit === 0) return "0%";
	if (!goal && hit) return "100%";
	if (goal && !hit) return "0%";
	if (goal && hit) {
		let percentage: number | string = (hit / goal) * 100;
		percentage = percentage > 100 ? 100 : percentage.toFixed(2);
		return `${percentage}%`;
	}
}

/** Linha de acompanhamento de meta (barra + percentual + realizado/meta), sem card. */
export function GoalTrackingBar({ valueGoal, valueHit, formattedValueGoal, formattedValueHit, barHeight, barClassName, barStyle }: GoalTrackingBarProps) {
	return (
		<div className="flex w-full items-center gap-1">
			<div className="flex grow gap-2">
				<div className="grow">
					<div
						style={{
							...barStyle,
							width: getWidth({ goal: valueGoal, hit: valueHit }),
							height: barHeight,
						}}
						className={cn("flex items-center justify-center rounded-sm text-xs text-white shadow-xs", barClassName)}
					/>
				</div>
			</div>
			<div className="flex min-w-[70px] flex-col items-end justify-end lg:min-w-[100px]">
				<p className="text-xs font-medium uppercase tracking-tight lg:text-sm">{getPercentage({ goal: valueGoal, hit: valueHit })}</p>
				<p className="text-[0.5rem] italic text-gray-500 lg:text-[0.65rem]">
					<strong>{formattedValueHit || valueHit?.toLocaleString("pt-br", { maximumFractionDigits: 2 }) || 0}</strong> de{" "}
					<strong>{formattedValueGoal || valueGoal?.toLocaleString("pt-br", { maximumFractionDigits: 2 }) || 0}</strong>{" "}
				</p>
			</div>
		</div>
	);
}

type GoalTrackingCardProps = GoalTrackingBarProps & {
	goalText: string;
};

/** Variante com card + header (título + ícone de meta) envolvendo a barra. */
export function GoalTrackingCard({ goalText, ...barProps }: GoalTrackingCardProps) {
	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">{goalText}</h1>
				<div className="flex items-center gap-2">
					<GoalIcon className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<GoalTrackingBar {...barProps} />
		</div>
	);
}
