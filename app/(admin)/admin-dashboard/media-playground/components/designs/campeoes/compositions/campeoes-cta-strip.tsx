import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesCtaStripProps = {
	tokens: CampeoesLayoutTokens;
	ctaLineSize: number;
	flexDirection: "row" | "column";
	body: ReactNode;
	buttonFontMultiplier: number;
	className?: string;
};

export function CampeoesCtaStrip({ tokens, ctaLineSize, flexDirection, body, buttonFontMultiplier, className }: CampeoesCtaStripProps) {
	const { t } = tokens;
	const isColumn = flexDirection === "column";

	return (
		<div
			data-design-role="campeoes-cta-strip"
			className={cn(className)}
			style={{
				width: "100%",
				alignSelf: "stretch",
				boxSizing: "border-box",
				padding: `${Math.round(14 * t)}px ${Math.round(16 * t)}px`,
				borderRadius: Math.round(12 * t),
				border: "1px solid rgba(255, 205, 46, 0.22)",
				borderLeftWidth: Math.max(3, Math.round(4 * t)),
				borderLeftColor: "#FFCD2E",
				background: "linear-gradient(105deg, rgba(255,255,255,0.09) 0%, rgba(6,18,38,0.55) 100%)",
				boxShadow: "0 10px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
				display: "flex",
				flexDirection,
				alignItems: isColumn ? "stretch" : "center",
				justifyContent: "space-between",
				gap: Math.round(14 * t),
			}}
		>
			<p
				style={{
					margin: 0,
					flex: "1 1 auto",
					minWidth: 0,
					fontSize: ctaLineSize,
					fontWeight: 500,
					color: "rgba(248,250,252,0.9)",
					lineHeight: 1.52,
					letterSpacing: "-0.01em",
				}}
			>
				{body}
			</p>
			<div
				style={{
					flexShrink: 0,
					alignSelf: isColumn ? "stretch" : "center",
					textAlign: "center",
					background: "linear-gradient(180deg, #FFDC4A 0%, #FFCD2E 35%, #FFB800 100%)",
					color: "#0A0F18",
					fontWeight: 800,
					fontSize: Math.round(buttonFontMultiplier * t),
					padding: `${Math.round(12 * t)}px ${Math.round(18 * t)}px`,
					borderRadius: Math.round(10 * t),
					letterSpacing: "0.06em",
					whiteSpace: "nowrap",
					textTransform: "uppercase",
					boxShadow:
						"0 0 0 1px rgba(255,255,255,0.45) inset, 0 2px 0 rgba(255,255,255,0.35) inset, 0 12px 32px rgba(255,184,0,0.42), 0 0 28px rgba(255,205,46,0.35)",
				}}
			>
				Venha já testar
			</div>
		</div>
	);
}
