import { formatCurrency, formatNumber, truncateText } from "@/lib/reports/formatters";
import { hexToRgba } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CampaignTopListProps = {
	campanhas: TCampaignReportPayload["campaign"]["topCampanhas"];
	theme: TCampaignReportPayload["theme"];
};

export function CampaignTopList({ campanhas, theme }: CampaignTopListProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: 30,
				borderRadius: 28,
				backgroundColor: "rgba(255,255,255,0.94)",
				border: "1px solid rgba(15,23,42,0.08)",
				boxShadow: "0 16px 44px rgba(15,23,42,0.07)",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Campanhas que mais geraram receita</span>
				<span style={{ fontSize: 16, color: "rgba(15,23,42,0.56)" }}>Ranking por receita atribuída no período</span>
			</div>

			{campanhas.length > 0 ? (
				<div style={{ display: "flex", flexDirection: "column" }}>
					{campanhas.map((campanha, index) => (
						<div
							key={campanha.campanhaId}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 16,
								padding: "16px 0",
								borderTop: index === 0 ? "none" : "1px solid rgba(15,23,42,0.07)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
								<div
									style={{
										display: "flex",
										width: 34,
										height: 34,
										borderRadius: 999,
										backgroundColor: hexToRgba(theme.primary, 0.16),
										alignItems: "center",
										justifyContent: "center",
										color: "#0F172A",
										fontWeight: 700,
										fontSize: 15,
									}}
								>
									{index + 1}
								</div>
								<span style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>{truncateText(campanha.titulo, 34)}</span>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
								<span style={{ fontSize: 16, color: "rgba(15,23,42,0.56)" }}>{formatNumber(campanha.conversoes)} conv.</span>
								<span style={{ fontSize: 19, fontWeight: 700, color: "#0F172A", minWidth: 130, textAlign: "right" }}>
									{formatCurrency(campanha.receita)}
								</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<div
					style={{
						display: "flex",
						minHeight: 100,
						alignItems: "center",
						justifyContent: "center",
						fontSize: 16,
						color: "rgba(15,23,42,0.5)",
					}}
				>
					Nenhuma campanha gerou receita atribuída no período.
				</div>
			)}
		</div>
	);
}
