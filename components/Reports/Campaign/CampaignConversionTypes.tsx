import { formatCurrency, formatNumber, formatPercentage } from "@/lib/reports/formatters";
import { hexToRgba } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CampaignConversionTypesProps = {
	distribuicao: TCampaignReportPayload["campaign"]["distribuicaoTipos"];
	theme: TCampaignReportPayload["theme"];
};

export function CampaignConversionTypes({ distribuicao, theme }: CampaignConversionTypesProps) {
	const maxPercentual = distribuicao.reduce((acc, item) => Math.max(acc, item.percentual), 0) || 100;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 22,
				padding: 30,
				borderRadius: 28,
				backgroundColor: "rgba(255,255,255,0.94)",
				border: "1px solid rgba(15,23,42,0.08)",
				boxShadow: "0 16px 44px rgba(15,23,42,0.07)",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Tipos de conversão</span>
				<span style={{ fontSize: 16, color: "rgba(15,23,42,0.56)" }}>Como as campanhas moveram seus clientes no período</span>
			</div>

			{distribuicao.length > 0 ? (
				<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
					{distribuicao.map((item) => {
						const barWidth = Math.max((item.percentual / maxPercentual) * 100, 4);
						const barColor = item.destaque ? theme.primary : hexToRgba(theme.secondary, 0.55);
						const trackColor = item.destaque ? hexToRgba(theme.primary, 0.14) : "rgba(15,23,42,0.06)";

						return (
							<div key={item.tipo} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
										<span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{item.label}</span>
										{item.destaque ? (
											<div
												style={{
													display: "flex",
													padding: "2px 10px",
													borderRadius: 999,
													backgroundColor: hexToRgba(theme.primary, 0.16),
												}}
											>
												<span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#0F172A" }}>
													Retenção
												</span>
											</div>
										) : null}
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
										<span style={{ fontSize: 16, fontWeight: 600, color: "rgba(15,23,42,0.62)" }}>{formatNumber(item.quantidade)} conv.</span>
										<span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", minWidth: 130, textAlign: "right" }}>
											{formatCurrency(item.receita)}
										</span>
									</div>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
									<div
										style={{
											display: "flex",
											flex: 1,
											height: 16,
											borderRadius: 999,
											backgroundColor: trackColor,
											overflow: "hidden",
										}}
									>
										<div style={{ display: "flex", width: `${barWidth}%`, height: "100%", borderRadius: 999, backgroundColor: barColor }} />
									</div>
									<span style={{ fontSize: 15, fontWeight: 700, color: "rgba(15,23,42,0.62)", minWidth: 56, textAlign: "right" }}>
										{formatPercentage(item.percentual, 0)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div
					style={{
						display: "flex",
						minHeight: 120,
						alignItems: "center",
						justifyContent: "center",
						textAlign: "center",
						fontSize: 16,
						color: "rgba(15,23,42,0.5)",
					}}
				>
					Ainda sem conversões classificadas neste período.
				</div>
			)}
		</div>
	);
}
