import { cn } from "@/lib/utils";
import {
	PIOR_DIA_REVENUE_AFTER,
	PIOR_DIA_REVENUE_BEFORE,
	PIOR_DIA_REVENUE_DELTA,
	PIOR_DIA_REVENUE_TREND_AFTER,
	PIOR_DIA_REVENUE_TREND_BEFORE,
} from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaStepConversionProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

/**
 * Etapa 03 — RECEITA SOBE.
 * Apenas valores (antes/depois/delta) + mini gráfico — sem linha extra de micro-KPIs.
 */
export function PiorDiaStepConversion({ tokens, className }: PiorDiaStepConversionProps) {
	const { t } = tokens;

	return (
		<div
			data-design-role="pior-dia-step-conversion"
			className={cn(className)}
			style={{ display: "flex", flexDirection: "column" }}
		>
			<div
				style={{
					background: "linear-gradient(160deg, #ECFDF5 0%, #F8FAFC 55%, #FFFFFF 100%)",
					border: "1px solid #A7F3D0",
					borderRadius: Math.round(14 * t),
					padding: `${Math.round(11 * t)}px ${Math.round(13 * t)}px`,
					display: "flex",
					gap: Math.round(12 * t),
					alignItems: "center",
				}}
			>
				<div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: Math.round(6 * t), minWidth: 0 }}>
					<span
						style={{
							fontSize: Math.round(8.5 * t),
							fontWeight: 800,
							color: "#64748B",
							letterSpacing: "0.10em",
							textTransform: "uppercase",
						}}
					>
						Receita na quarta
					</span>

					<div style={{ display: "flex", alignItems: "center", gap: Math.round(8 * t) }}>
						<span
							style={{
								fontSize: Math.round(13 * t),
								fontWeight: 700,
								color: "#94A3B8",
								textDecoration: "line-through",
								textDecorationColor: "rgba(239,68,68,0.55)",
							}}
						>
							{PIOR_DIA_REVENUE_BEFORE}
						</span>
						<svg width={Math.round(12 * t)} height={Math.round(12 * t)} viewBox="0 0 24 24" fill="none">
							<polyline
								points="5,12 19,12 14,7"
								stroke="#94A3B8"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>

					<div style={{ display: "flex", alignItems: "baseline", gap: Math.round(8 * t), flexWrap: "wrap" }}>
						<span
							style={{
								fontSize: Math.round(28 * t),
								fontWeight: 900,
								color: "#34D399",
								letterSpacing: "-0.03em",
								lineHeight: 1,
							}}
						>
							{PIOR_DIA_REVENUE_AFTER}
						</span>
						<div
							style={{
								background: "rgba(16,185,129,0.20)",
								border: "1px solid rgba(16,185,129,0.45)",
								color: "#34D399",
								fontSize: Math.round(11 * t),
								fontWeight: 900,
								padding: `${Math.round(3 * t)}px ${Math.round(8 * t)}px`,
								borderRadius: Math.round(6 * t),
								letterSpacing: "0.02em",
								boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
							}}
						>
							{PIOR_DIA_REVENUE_DELTA}
						</div>
					</div>
				</div>

				<RevenueTrendChart tokens={tokens} />
			</div>
		</div>
	);
}

function RevenueTrendChart({ tokens }: { tokens: PiorDiaLayoutTokens }) {
	const { t } = tokens;
	const w = Math.round(140 * t);
	const h = Math.round(60 * t);
	const padX = 4;
	const padY = 6;

	const before = PIOR_DIA_REVENUE_TREND_BEFORE;
	const after = PIOR_DIA_REVENUE_TREND_AFTER;
	const max = Math.max(...before, ...after, 100);

	const toPath = (vals: readonly number[]) => {
		const stepX = (w - padX * 2) / (vals.length - 1);
		return vals
			.map((v, i) => {
				const x = padX + stepX * i;
				const y = padY + (1 - v / max) * (h - padY * 2);
				return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(" ");
	};

	const toAreaPath = (vals: readonly number[]) => {
		const stepX = (w - padX * 2) / (vals.length - 1);
		const points = vals.map((v, i) => {
			const x = padX + stepX * i;
			const y = padY + (1 - v / max) * (h - padY * 2);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		});
		return `M ${padX},${h - padY} L ${points.join(" L ")} L ${w - padX},${h - padY} Z`;
	};

	return (
		<div
			style={{
				width: w,
				height: h,
				flexShrink: 0,
				position: "relative",
				borderRadius: Math.round(8 * t),
				background: "#F1F5F9",
				border: "1px solid #E2E8F0",
				overflow: "hidden",
			}}
		>
			<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
				<defs>
					<linearGradient id="pior-dia-trend-area" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#10B981" stopOpacity="0.55" />
						<stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
					</linearGradient>
				</defs>

				{[0.25, 0.5, 0.75].map((g) => (
					<line
						key={g}
						x1={padX}
						x2={w - padX}
						y1={padY + g * (h - padY * 2)}
						y2={padY + g * (h - padY * 2)}
						stroke="rgba(15,23,42,0.06)"
						strokeWidth="1"
					/>
				))}

				<path d={toPath(before)} fill="none" stroke="rgba(100,116,139,0.45)" strokeWidth="1.6" strokeDasharray="3 3" />

				<path d={toAreaPath(after)} fill="url(#pior-dia-trend-area)" />
				<path
					d={toPath(after)}
					fill="none"
					stroke="#34D399"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{(() => {
					const stepX = (w - padX * 2) / (after.length - 1);
					const lastIdx = after.length - 1;
					const lastVal = after[lastIdx];
					const cx = padX + stepX * lastIdx;
					const cy = padY + (1 - lastVal / max) * (h - padY * 2);
					return (
						<>
							<circle cx={cx} cy={cy} r="6" fill="#34D399" fillOpacity="0.18" />
							<circle cx={cx} cy={cy} r="3" fill="#34D399" />
							<circle cx={cx} cy={cy} r="1.4" fill="#FFFFFF" />
						</>
					);
				})()}

				<g transform={`translate(${w - 22}, 6)`}>
					<polyline
						points="2,12 8,6 12,9 18,2"
						fill="none"
						stroke="#34D399"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity="0.55"
					/>
				</g>
			</svg>
		</div>
	);
}
