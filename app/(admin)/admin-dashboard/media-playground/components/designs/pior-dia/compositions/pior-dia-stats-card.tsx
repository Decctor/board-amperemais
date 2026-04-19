import { cn } from "@/lib/utils";
import {
	PIOR_DIA_REVENUE_AFTER,
	PIOR_DIA_REVENUE_BEFORE,
	PIOR_DIA_REVENUE_DELTA,
	PIOR_DIA_SECONDARY_STATS,
} from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaStatsCardProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

export function PiorDiaStatsCard({ tokens, className }: PiorDiaStatsCardProps) {
	const { t, radiusMd } = tokens;

	const labelSize = Math.round(9 * t);
	const beforeSize = Math.round(15 * t);
	const afterSize = Math.round(22 * t);
	const deltaSize = Math.round(10 * t);
	const kpiLabelSize = Math.round(9 * t);
	const kpiValueSize = Math.round(16 * t);

	return (
		<div
			data-design-role="pior-dia-stats-card"
			className={cn(className)}
			style={{
				background: "rgba(255,255,255,0.08)",
				border: "1px solid rgba(255,255,255,0.14)",
				borderRadius: radiusMd,
				padding: `${Math.round(14 * t)}px ${Math.round(18 * t)}px`,
				display: "flex",
				flexDirection: "row",
				gap: Math.round(18 * t),
				alignItems: "stretch",
			}}
		>
			{/* Left — before/after revenue */}
			<div
				style={{
					flex: "0 0 auto",
					display: "flex",
					flexDirection: "column",
					gap: Math.round(6 * t),
					paddingRight: Math.round(18 * t),
					borderRight: "1px solid rgba(255,255,255,0.12)",
				}}
			>
				<div
					style={{
						fontSize: labelSize,
						fontWeight: 700,
						color: "rgba(248,250,252,0.45)",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
					}}
				>
					Receita no Pior Dia
				</div>

				{/* Before value */}
				<div style={{ display: "flex", alignItems: "center", gap: Math.round(6 * t) }}>
					<span
						style={{
							fontSize: beforeSize,
							fontWeight: 600,
							color: "rgba(248,250,252,0.35)",
							textDecoration: "line-through",
							textDecorationColor: "rgba(239,68,68,0.6)",
						}}
					>
						{PIOR_DIA_REVENUE_BEFORE}
					</span>
					<svg width={Math.round(14 * t)} height={Math.round(14 * t)} viewBox="0 0 24 24" fill="none">
						<polyline points="5,12 19,12 14,7" stroke="rgba(248,250,252,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>

				{/* After value */}
				<div style={{ display: "flex", alignItems: "baseline", gap: Math.round(8 * t) }}>
					<span
						style={{
							fontSize: afterSize,
							fontWeight: 900,
							color: "#10B981",
							letterSpacing: "-0.02em",
						}}
					>
						{PIOR_DIA_REVENUE_AFTER}
					</span>
					<div
						style={{
							background: "rgba(16,185,129,0.18)",
							border: "1px solid rgba(16,185,129,0.35)",
							color: "#10B981",
							fontSize: deltaSize,
							fontWeight: 800,
							padding: `${Math.round(2 * t)}px ${Math.round(7 * t)}px`,
							borderRadius: Math.round(6 * t),
							letterSpacing: "0.02em",
						}}
					>
						{PIOR_DIA_REVENUE_DELTA}
					</div>
				</div>
			</div>

			{/* Right — secondary KPIs */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					gap: Math.round(6 * t),
				}}
			>
				{PIOR_DIA_SECONDARY_STATS.map((stat) => (
					<div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: Math.round(2 * t) }}>
						<div
							style={{
								fontSize: kpiLabelSize,
								fontWeight: 600,
								color: "rgba(248,250,252,0.45)",
								letterSpacing: "0.04em",
								textTransform: "uppercase",
							}}
						>
							{stat.label}
						</div>
						<div
							style={{
								fontSize: kpiValueSize,
								fontWeight: 800,
								color: "#FAFAFA",
								letterSpacing: "-0.01em",
							}}
						>
							{stat.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
