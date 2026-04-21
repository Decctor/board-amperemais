import type { TReportTheme } from "@/lib/reports/types";

type ReportHeaderProps = {
	theme: TReportTheme;
	title: string;
	periodLabel: string;
	logoSrc?: string | null;
};

export function ReportHeader({ theme, title, periodLabel, logoSrc }: ReportHeaderProps) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
				<div
					style={{
						width: 88,
						height: 88,
						borderRadius: 24,
						background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
						boxShadow: "0 12px 24px rgba(36,84,156,0.18)",
					}}
				>
					{logoSrc ? (
						<img
							src={logoSrc}
							alt={`Logo ${theme.orgName}`}
							width={88}
							height={88}
							style={{ width: 88, height: 88, objectFit: "cover" }}
						/>
					) : (
						<span style={{ fontSize: 28, fontWeight: 700, color: theme.primaryForeground }}>{theme.orgName.slice(0, 2).toUpperCase()}</span>
					)}
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<span style={{ fontSize: 14, letterSpacing: 2.8, textTransform: "uppercase", color: "rgba(15,23,42,0.56)" }}>Recompra CRM</span>
					<span style={{ fontSize: 34, fontWeight: 700, color: "#0F172A" }}>{theme.orgName}</span>
					<span style={{ fontSize: 18, color: "rgba(15,23,42,0.62)" }}>{title}</span>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					padding: "16px 18px",
					borderRadius: 20,
					backgroundColor: "rgba(255,255,255,0.78)",
					border: "1px solid rgba(15,23,42,0.08)",
				}}
			>
				<span style={{ fontSize: 13, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(15,23,42,0.52)" }}>Período</span>
				<span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", textAlign: "right" }}>{periodLabel}</span>
			</div>
		</div>
	);
}
