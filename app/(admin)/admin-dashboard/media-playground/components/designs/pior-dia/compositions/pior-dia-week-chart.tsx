import { cn } from "@/lib/utils";
import { PIOR_DIA_WEEK_BARS } from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type Bar = (typeof PIOR_DIA_WEEK_BARS)[number];

type PiorDiaWeekChartProps = {
	tokens: PiorDiaLayoutTokens;
	cardWidth?: number;
	compact?: boolean;
	className?: string;
};

export function PiorDiaWeekChart({ tokens, cardWidth, compact = false, className }: PiorDiaWeekChartProps) {
	const { t, radiusMd } = tokens;

	const maxBarPx = Math.round(compact ? 64 * t : 90 * t);
	const barW = Math.round(compact ? 22 * t : 26 * t);
	const dayLabelSize = Math.round(9 * t);
	const valueLabelSize = Math.round(8 * t);
	const headerSize = Math.round(9 * t);
	const footerSize = Math.round(8 * t);
	const pillSize = Math.round(8 * t);

	const cardPadX = Math.round(18 * t);
	const cardPadY = Math.round(16 * t);
	const barGap = Math.round(6 * t);

	return (
		<div
			data-design-role="pior-dia-week-chart"
			className={cn(className)}
			style={{
				width: cardWidth,
				background: "linear-gradient(135deg, #FFFFFF 0%, #F4F7FB 100%)",
				borderRadius: radiusMd,
				padding: `${cardPadY}px ${cardPadX}px`,
				boxShadow: "0 16px 48px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.16)",
				transform: "rotate(-0.9deg)",
				boxSizing: "border-box",
			}}
		>
			{/* Card header */}
			<div
				style={{
					fontSize: headerSize,
					fontWeight: 700,
					color: "#94A3B8",
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					marginBottom: Math.round(14 * t),
				}}
			>
				Análise de Receita — 8 Semanas
			</div>

			{/* Bars */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-end",
					gap: barGap,
					height: maxBarPx + Math.round(32 * t),
					position: "relative",
				}}
			>
				{PIOR_DIA_WEEK_BARS.map((bar: Bar) => {
					const barH = Math.max(6, Math.round((bar.value / 100) * maxBarPx));
					const isWorst = bar.isWorst;
					return (
						<div
							key={bar.day}
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: Math.round(4 * t),
								flex: "1 1 0",
								position: "relative",
							}}
						>
							{/* "PIOR DIA" floating pill */}
							{isWorst && (
								<div
									style={{
										position: "absolute",
										bottom: Math.round(20 * t) + barH + Math.round(4 * t),
										left: "50%",
										transform: "translateX(-50%)",
										background: "#EF4444",
										color: "#FFFFFF",
										fontSize: pillSize,
										fontWeight: 800,
										letterSpacing: "0.05em",
										padding: `${Math.round(2 * t)}px ${Math.round(5 * t)}px`,
										borderRadius: Math.round(4 * t),
										whiteSpace: "nowrap",
										zIndex: 2,
									}}
								>
									PIOR DIA
								</div>
							)}

							{/* Value label above bar */}
							<div
								style={{
									fontSize: valueLabelSize,
									fontWeight: 700,
									color: isWorst ? "#EF4444" : "#64748B",
									position: "absolute",
									bottom: Math.round(20 * t) + barH + (isWorst ? Math.round(18 * t) : 0),
									left: "50%",
									transform: "translateX(-50%)",
									whiteSpace: "nowrap",
								}}
							/>

							{/* Bar */}
							<div
								style={{
									width: barW,
									height: barH,
									background: isWorst
										? "linear-gradient(180deg, #F87171 0%, #EF4444 100%)"
										: "linear-gradient(180deg, #94A3B8 0%, #CBD5E1 100%)",
									borderRadius: `${Math.round(4 * t)}px ${Math.round(4 * t)}px 0 0`,
									flexShrink: 0,
									boxShadow: isWorst ? "0 4px 12px rgba(239,68,68,0.35)" : "none",
									alignSelf: "flex-end",
								}}
							/>

							{/* Day label */}
							<div
								style={{
									fontSize: dayLabelSize,
									fontWeight: isWorst ? 800 : 600,
									color: isWorst ? "#EF4444" : "#64748B",
									letterSpacing: "0.04em",
									marginTop: Math.round(4 * t),
								}}
							>
								{bar.day}
							</div>
						</div>
					);
				})}
			</div>

			{/* Card footer */}
			<div
				style={{
					marginTop: Math.round(10 * t),
					paddingTop: Math.round(8 * t),
					borderTop: "1px solid #E2E8F0",
					fontSize: footerSize,
					color: "#94A3B8",
					fontWeight: 500,
					letterSpacing: "0.01em",
				}}
			>
				Detecção automática • 8 semanas de histórico
			</div>
		</div>
	);
}
