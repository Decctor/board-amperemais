import { formatNumber, formatPercentage } from "@/lib/reports/formatters";
import { hexToRgba } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CampaignImpactRowProps = {
	campaign: TCampaignReportPayload["campaign"];
	theme: TCampaignReportPayload["theme"];
};

function ImpactCard({
	accent,
	eyebrow,
	value,
	detail,
}: {
	accent: string;
	eyebrow: string;
	value: string;
	detail: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 10,
				flex: 1,
				padding: 26,
				borderRadius: 24,
				backgroundColor: "rgba(255,255,255,0.94)",
				border: "1px solid rgba(15,23,42,0.08)",
				boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, backgroundColor: accent }} />
				<span style={{ fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(15,23,42,0.5)" }}>{eyebrow}</span>
			</div>
			<span style={{ fontSize: 40, fontWeight: 700, color: "#0F172A" }}>{value}</span>
			<span style={{ fontSize: 16, color: "rgba(15,23,42,0.6)" }}>{detail}</span>
		</div>
	);
}

export function CampaignImpactRow({ campaign, theme }: CampaignImpactRowProps) {
	const { impactoFrequencia, impactoMonetario } = campaign;

	const aceleracaoDetail = impactoFrequencia.confiavel
		? `Em média ${formatNumber(Math.round(impactoFrequencia.diasAntecipadosMedio))} dias antes do ciclo de compra`
		: "Antecipações em relação ao ciclo de compra";

	const ticketDetail =
		impactoMonetario.aumentoPercentualMedio > 0
			? `Ticket ${formatPercentage(impactoMonetario.aumentoPercentualMedio, 0)} acima da média do cliente`
			: "Compras acima do ticket médio do cliente";

	return (
		<div style={{ display: "flex", gap: 18 }}>
			<ImpactCard
				accent={theme.primary}
				eyebrow="Compras antecipadas"
				value={formatNumber(impactoFrequencia.totalAceleradas)}
				detail={aceleracaoDetail}
			/>
			<ImpactCard
				accent={hexToRgba(theme.secondary, 0.85)}
				eyebrow="Compras acima do ticket"
				value={formatNumber(impactoMonetario.totalAcimaTicket)}
				detail={ticketDetail}
			/>
		</div>
	);
}
