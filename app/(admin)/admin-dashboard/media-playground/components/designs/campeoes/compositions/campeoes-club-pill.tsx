import { cn } from "@/lib/utils";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesClubPillProps = {
	tokens: CampeoesLayoutTokens;
	className?: string;
};

export function CampeoesClubPill({ tokens, className }: CampeoesClubPillProps) {
	const { t } = tokens;

	return (
		<div
			data-design-role="campeoes-club-pill"
			className={cn(className)}
			style={{
				display: "inline-flex",
				alignItems: "center",
				alignSelf: "flex-start",
				gap: Math.round(10 * t),
				backgroundColor: "rgba(6, 18, 38, 0.72)",
				border: "1px solid rgba(255,255,255,0.14)",
				borderRadius: 999,
				padding: `${Math.round(8 * t)}px ${Math.round(18 * t)}px ${Math.round(8 * t)}px ${Math.round(14 * t)}px`,
				boxShadow: "0 8px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
			}}
		>
			<div
				style={{
					width: Math.round(8 * t),
					height: Math.round(8 * t),
					borderRadius: "50%",
					backgroundColor: "#34D399",
					boxShadow: "0 0 0 3px rgba(52,211,153,0.22)",
					flexShrink: 0,
				}}
			/>
			<span
				style={{
					fontSize: Math.round(11 * t),
					fontWeight: 800,
					color: "#F8FAFC",
					letterSpacing: "0.04em",
				}}
			>
				CLUBE CAMPEÕES AMPÈRE+
			</span>
			<div
				style={{
					backgroundColor: "rgba(52,211,153,0.14)",
					border: "1px solid rgba(52,211,153,0.32)",
					borderRadius: 8,
					padding: `${Math.round(3 * t)}px ${Math.round(9 * t)}px`,
				}}
			>
				<span
					style={{
						fontSize: Math.round(9 * t),
						fontWeight: 800,
						color: "#6EE7B7",
						letterSpacing: "0.06em",
					}}
				>
					ATIVA
				</span>
			</div>
		</div>
	);
}
