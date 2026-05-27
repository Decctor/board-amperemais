import { formatCurrency, formatPercentage } from "@/lib/reports/formatters";

type ReportGoalBarProps = {
	goal: number;
	current: number;
	primary: string;
	secondary: string;
};

function safePercentage(current: number, goal: number) {
	if (goal <= 0) return 0;
	return Math.max(0, Math.min((current / goal) * 100, 100));
}

export function ReportGoalBar({ goal, current, primary, secondary }: ReportGoalBarProps) {
	if (goal <= 0) {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(15,23,42,0.5)" }}>Meta do período</span>
				<div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Meta indisponível para este período.</div>
			</div>
		);
	}

	const progress = safePercentage(current, goal);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(15,23,42,0.5)" }}>Meta do período</span>
				<span style={{ fontSize: 16, fontWeight: 700, color: secondary }}>{formatPercentage(progress, 1)} atingido</span>
			</div>
			<div
				style={{
					display: "flex",
					width: "100%",
					height: 18,
					borderRadius: 999,
					backgroundColor: "rgba(15,23,42,0.08)",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						width: `${progress}%`,
						height: "100%",
						borderRadius: 999,
						background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
					}}
				/>
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "rgba(15,23,42,0.66)", fontSize: 16 }}>
				<span>Realizado: {formatCurrency(current)}</span>
				<span>Meta: {formatCurrency(goal)}</span>
			</div>
		</div>
	);
}
