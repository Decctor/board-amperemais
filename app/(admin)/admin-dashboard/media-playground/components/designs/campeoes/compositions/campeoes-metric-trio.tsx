import { cn } from "@/lib/utils";
import { CAMPEOES_METRIC_TRIO } from "../constants";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesMetricTrioProps = {
	tokens: CampeoesLayoutTokens;
	className?: string;
};

export function CampeoesMetricTrio({ tokens, className }: CampeoesMetricTrioProps) {
	const { t, radiusMd } = tokens;

	return (
		<div
			data-design-role="campeoes-metric-trio"
			className={cn(className)}
			style={{
				display: "grid",
				gridTemplateColumns: "1fr 1fr 1fr",
				gap: Math.round(12 * t),
			}}
		>
			{CAMPEOES_METRIC_TRIO.map((card) => (
				<div
					key={card.label}
					style={{
						borderRadius: radiusMd,
						background: card.accent,
						border: "borderAccent" in card ? card.borderAccent : "1px solid rgba(255,255,255,0.65)",
						boxShadow: "0 10px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
						padding: `${Math.round(14 * t)}px ${Math.round(16 * t)}px`,
						minWidth: 0,
					}}
				>
					<div
						style={{
							fontSize: Math.round(8 * t),
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.09em",
							color: "#94A3B8",
							marginBottom: Math.round(6 * t),
						}}
					>
						{card.label}
					</div>
					<div
						style={{
							fontSize: Math.round(26 * t),
							fontWeight: 800,
							color: card.valueColor,
							letterSpacing: "-0.025em",
							lineHeight: 1.1,
						}}
					>
						{card.value}
					</div>
				</div>
			))}
		</div>
	);
}
