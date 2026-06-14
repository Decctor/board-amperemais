import { formatCurrency, formatNumber } from "@/lib/reports/formatters";
import { getComparisonMeta } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CommercialSummaryStripProps = {
	commercial: TCampaignReportPayload["commercial"];
};

type SummaryMetric = {
	label: string;
	value: string;
	delta?: { current: number; previous: number | undefined };
};

function SummaryItem({ label, value, delta }: SummaryMetric) {
	const meta = delta ? getComparisonMeta(delta.current, delta.previous) : null;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
			<span style={{ fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>{label}</span>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<span style={{ fontSize: 26, fontWeight: 700, color: "#FFFFFF" }}>{value}</span>
				{meta ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							padding: "3px 9px",
							borderRadius: 999,
							backgroundColor: "rgba(255,255,255,0.16)",
							color: "#FFFFFF",
						}}
					>
						<span style={{ fontSize: 13, fontWeight: 700 }}>{meta.icon}</span>
						<span style={{ fontSize: 13, fontWeight: 700 }}>{meta.deltaLabel}</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function CommercialSummaryStrip({ commercial }: CommercialSummaryStripProps) {
	// Only surface gross margin when the org actually tracks product cost; otherwise it equals revenue and misleads.
	const tracksCost = commercial.custoTotal > 0;
	const itensPorVenda = Math.round(commercial.itensPorVenda * 10) / 10;

	const firstRow: SummaryMetric[] = [
		{
			label: "Faturamento total",
			value: formatCurrency(commercial.faturamento.atual),
			delta: { current: commercial.faturamento.atual, previous: commercial.faturamento.anterior },
		},
		{ label: "Vendas realizadas", value: formatNumber(commercial.qtdeVendas) },
		{ label: "Ticket médio", value: formatCurrency(commercial.ticketMedio) },
	];

	const secondRow: SummaryMetric[] = [
		{ label: "Itens vendidos", value: formatNumber(commercial.qtdeItensVendidos) },
		{ label: "Média diária", value: formatCurrency(commercial.valorDiarioVendido) },
		tracksCost
			? { label: "Margem bruta", value: formatCurrency(commercial.margemBruta) }
			: { label: "Itens por venda", value: formatNumber(itensPorVenda) },
	];

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 22,
				padding: 30,
				borderRadius: 26,
				backgroundColor: "#0F172A",
				boxShadow: "0 18px 44px rgba(15,23,42,0.22)",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
					Resumo comercial
				</span>
				<span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Total do período · todas as vendas</span>
			</div>
			<div style={{ display: "flex", gap: 24 }}>
				{firstRow.map((metric) => (
					<SummaryItem key={metric.label} {...metric} />
				))}
			</div>
			<div style={{ display: "flex", height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
			<div style={{ display: "flex", gap: 24 }}>
				{secondRow.map((metric) => (
					<SummaryItem key={metric.label} {...metric} />
				))}
			</div>
		</div>
	);
}
