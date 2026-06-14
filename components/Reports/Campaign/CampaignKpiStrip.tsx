import { formatCurrency, formatNumber } from "@/lib/reports/formatters";
import { getComparisonMeta } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CampaignKpiStripProps = {
	campaign: TCampaignReportPayload["campaign"];
};

type KpiCell = {
	label: string;
	value: string;
	delta?: { current: number; previous: number | undefined };
};

function DeltaBadge({ current, previous }: { current: number; previous: number | undefined }) {
	const meta = getComparisonMeta(current, previous);
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 4,
				padding: "3px 9px",
				borderRadius: 999,
				backgroundColor: meta.tone.background,
				color: meta.tone.color,
			}}
		>
			<span style={{ fontSize: 13, fontWeight: 700 }}>{meta.icon}</span>
			<span style={{ fontSize: 13, fontWeight: 700 }}>{meta.deltaLabel}</span>
		</div>
	);
}

export function CampaignKpiStrip({ campaign }: CampaignKpiStripProps) {
	const cells: KpiCell[] = [
		{
			label: "Mensagens enviadas",
			value: formatNumber(campaign.mensagensEnviadas.atual),
			delta: { current: campaign.mensagensEnviadas.atual, previous: campaign.mensagensEnviadas.anterior },
		},
		{
			label: "Clientes alcançados",
			value: formatNumber(campaign.clientesAlcancados),
		},
		{
			label: "Ticket médio convertido",
			value: formatCurrency(campaign.ticketMedioConversao),
		},
		{
			label: "Campanhas ativas",
			value: formatNumber(campaign.campanhasAtivas),
		},
	];

	return (
		<div style={{ display: "flex", gap: 16 }}>
			{cells.map((cell) => (
				<div
					key={cell.label}
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						gap: 14,
						flex: 1,
						minHeight: 132,
						padding: 22,
						borderRadius: 22,
						backgroundColor: "rgba(255,255,255,0.94)",
						border: "1px solid rgba(15,23,42,0.08)",
						boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
						<span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(15,23,42,0.5)", maxWidth: 130 }}>
							{cell.label}
						</span>
						{cell.delta ? <DeltaBadge current={cell.delta.current} previous={cell.delta.previous} /> : null}
					</div>
					<span style={{ fontSize: 28, fontWeight: 700, color: "#0F172A" }}>{cell.value}</span>
				</div>
			))}
		</div>
	);
}
