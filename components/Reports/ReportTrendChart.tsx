import { formatCurrency } from "@/lib/reports/formatters";
import type { TReportTimelinePoint } from "@/lib/reports/types";

type ReportTrendChartProps = {
	timeline: TReportTimelinePoint[];
	primary: string;
	secondary: string;
	width?: number;
	height?: number;
};

function normalizeValue(value: number, maxValue: number, chartHeight: number) {
	if (maxValue <= 0) return chartHeight - 12;
	return chartHeight - 12 - (value / maxValue) * (chartHeight - 42);
}

function buildPolyline(points: { x: number; y: number }[]) {
	return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function ReportTrendChart({ timeline, primary, secondary, width = 468, height = 188 }: ReportTrendChartProps) {
	const maxValue = Math.max(0, ...timeline.flatMap((point) => [point.current, point.previous]));
	const labelWidth = Math.max(28, Math.floor((width - 56) / Math.max(timeline.length, 1)));

	const currentPoints = timeline.map((point, index) => ({
		x: 28 + (index * (width - 56)) / Math.max(timeline.length - 1, 1),
		y: normalizeValue(point.current, maxValue, height),
	}));
	const previousPoints = timeline.map((point, index) => ({
		x: 28 + (index * (width - 56)) / Math.max(timeline.length - 1, 1),
		y: normalizeValue(point.previous, maxValue, height),
	}));

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(15,23,42,0.52)" }}>Ritmo de faturamento</span>
					<span style={{ fontSize: 16, color: "rgba(15,23,42,0.62)" }}>Atual vs. período anterior</span>
				</div>
				<div style={{ display: "flex", gap: 14, alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<svg width="30" height="14" viewBox="0 0 30 14" role="presentation" aria-hidden="true">
							<line x1="2" y1="7" x2="28" y2="7" stroke={primary} strokeWidth="4" strokeLinecap="round" />
							<circle cx="15" cy="7" r="4" fill={primary} />
						</svg>
						<span style={{ fontSize: 14, color: "rgba(15,23,42,0.72)" }}>Atual (contínua)</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<svg width="30" height="14" viewBox="0 0 30 14" role="presentation" aria-hidden="true">
							<line x1="2" y1="7" x2="28" y2="7" stroke={secondary} strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round" />
						</svg>
						<span style={{ fontSize: 14, color: "rgba(15,23,42,0.72)" }}>Anterior (pontilhada)</span>
					</div>
				</div>
			</div>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico comparativo de faturamento">
				{[0.25, 0.5, 0.75].map((position) => (
					<line
						key={position}
						x1="20"
						y1={height - height * position}
						x2={width - 20}
						y2={height - height * position}
						stroke="rgba(15,23,42,0.08)"
						strokeWidth="1"
					/>
				))}
				<polyline fill="none" stroke={secondary} strokeWidth="4" strokeDasharray="10 10" points={buildPolyline(previousPoints)} />
				<polyline fill="none" stroke={primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" points={buildPolyline(currentPoints)} />
				{currentPoints.map((point, index) => (
					<circle key={timeline[index]?.label} cx={point.x} cy={point.y} r="5.5" fill={primary} />
				))}
			</svg>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px" }}>
				{timeline.map((point) => (
					<div key={point.label} style={{ display: "flex", width: labelWidth, justifyContent: "center", fontSize: 12, color: "rgba(15,23,42,0.62)" }}>
						{point.label}
					</div>
				))}
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: 14, color: "rgba(15,23,42,0.58)" }}>Pico do período</span>
				<span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{formatCurrency(maxValue)}</span>
			</div>
		</div>
	);
}
