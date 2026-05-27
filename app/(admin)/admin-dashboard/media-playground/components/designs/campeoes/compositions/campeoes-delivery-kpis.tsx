import { cn } from "@/lib/utils";
import { DELIVERY_KPIS } from "../constants";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesDeliveryKpisProps = {
	tokens: CampeoesLayoutTokens;
	valueFontMultiplier: number;
	className?: string;
};

export function CampeoesDeliveryKpis({ tokens, valueFontMultiplier, className }: CampeoesDeliveryKpisProps) {
	const { t, radiusMd } = tokens;

	return (
		<div
			data-design-role="campeoes-delivery-kpis"
			className={cn(className)}
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(4, 1fr)",
				gap: Math.round(10 * t),
				width: "100%",
			}}
		>
			{DELIVERY_KPIS.map((item) => (
				<div
					key={item.label}
					style={{
						minWidth: 0,
						borderRadius: radiusMd,
						backgroundColor: "rgba(255,255,255,0.08)",
						border: "1px solid rgba(255,255,255,0.14)",
						padding: `${Math.round(20 * t)}px ${Math.round(16 * t)}px`,
						boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
					}}
				>
					<div
						style={{
							fontSize: Math.round(8 * t),
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.07em",
							color: "rgba(248,250,252,0.8)",
							marginBottom: Math.round(5 * t),
							lineHeight: 1.25,
						}}
					>
						{item.label}
					</div>
					<div
						style={{
							fontSize: Math.round(valueFontMultiplier * t),
							fontWeight: 800,
							color: "#F8FAFC",
							letterSpacing: "-0.02em",
							fontVariantNumeric: "tabular-nums",
							lineHeight: 1.15,
						}}
					>
						{item.value}
					</div>
				</div>
			))}
		</div>
	);
}
