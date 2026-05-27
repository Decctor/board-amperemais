import { formatCurrency, formatNumber } from "@/lib/reports/formatters";
import type { TSalesReportPayload } from "@/lib/reports/types";
import { ReportCard } from "./ReportCard";

type ReportStatGridProps = {
	payload: TSalesReportPayload;
};

type TStatConfig = {
	label: string;
	value: number;
	format: (value: number) => string;
};

function safeValue(value: number) {
	return Number.isFinite(value) ? value : 0;
}

function getStats(payload: TSalesReportPayload): TStatConfig[] {
	const common = [
		{
			label: "Número de vendas",
			value: safeValue(payload.stats.qtdeVendas.atual),
			format: formatNumber,
		},
		{
			label: "Ticket médio",
			value: safeValue(payload.stats.ticketMedio.atual),
			format: formatCurrency,
		},
	];

	if (payload.period.frequency === "daily") {
		return [
			...common,
			{
				label: "Itens vendidos",
				value: safeValue(payload.stats.qtdeItensVendidos.atual),
				format: formatNumber,
			},
		];
	}

	if (payload.period.frequency === "weekly") {
		return [
			...common,
			{
				label: "Média diária",
				value: safeValue(payload.stats.valorDiarioVendido.atual),
				format: formatCurrency,
			},
		];
	}

	return [
		...common,
		{
			label: "Itens por venda",
			value: safeValue(payload.stats.itensPorVendaMedio.atual),
			format: (value) => formatNumber(value),
		},
	];
}

export function ReportStatGrid({ payload }: ReportStatGridProps) {
	const stats = getStats(payload);

	return (
		<div style={{ display: "flex", gap: 18 }}>
			{stats.map((stat) => (
				<ReportCard key={stat.label} style={{ width: 320, minHeight: 126, gap: 12, justifyContent: "space-between", padding: 24 }}>
					<span style={{ fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(15,23,42,0.52)" }}>{stat.label}</span>
					<span style={{ fontSize: 30, fontWeight: 700, color: "#0F172A" }}>{stat.format(stat.value)}</span>
				</ReportCard>
			))}
		</div>
	);
}
