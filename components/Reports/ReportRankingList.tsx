import { formatCurrency, formatNumber, truncateText } from "@/lib/reports/formatters";
import type { PartnerRankingItem, ProductRankingItem, SellerRankingItem } from "@/lib/reports/data-fetchers";
import { ReportCard } from "./ReportCard";

type ReportRankingListProps = {
	title: string;
	items: SellerRankingItem[] | PartnerRankingItem[] | ProductRankingItem[];
	type: "seller" | "partner" | "product";
	accentColor: string;
};

function isSeller(item: SellerRankingItem | PartnerRankingItem | ProductRankingItem): item is SellerRankingItem {
	return "vendedorNome" in item;
}

function isPartner(item: SellerRankingItem | PartnerRankingItem | ProductRankingItem): item is PartnerRankingItem {
	return "parceiroNome" in item;
}

function getItemTitle(item: SellerRankingItem | PartnerRankingItem | ProductRankingItem) {
	if (isSeller(item)) return item.vendedorNome;
	if (isPartner(item)) return item.parceiroNome;
	return item.produtoDescricao;
}

function getItemMetric(item: SellerRankingItem | PartnerRankingItem | ProductRankingItem) {
	if (isSeller(item)) return `${item.qtdeVendas} vendas`;
	if (isPartner(item)) return `${item.qtdeVendas} vendas`;
	return `${formatNumber(item.quantidade)} un.`;
}

function getItemRevenue(item: SellerRankingItem | PartnerRankingItem | ProductRankingItem) {
	return formatCurrency(item.faturamento);
}

function getEmptyLabel(type: ReportRankingListProps["type"]) {
	if (type === "seller") return "Nenhum vendedor com vendas no período";
	if (type === "partner") return "Nenhum parceiro com vendas no período";
	return "Nenhum produto vendido no período";
}

export function ReportRankingList({ title, items, type, accentColor }: ReportRankingListProps) {
	const validItems = items.filter((item) => getItemTitle(item) !== "N/A").slice(0, 3);

	return (
		<ReportCard style={{ width: 320, gap: 18, padding: 24 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</span>
				<div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, backgroundColor: accentColor }} />
			</div>
			{validItems.length > 0 ? (
				validItems.map((item, index) => (
					<div
						key={`${title}-${index}`}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 14,
							padding: "14px 0",
							borderTop: index === 0 ? "1px solid rgba(15,23,42,0.06)" : "1px solid rgba(15,23,42,0.06)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
							<div
								style={{
									width: 28,
									height: 28,
									borderRadius: 999,
									backgroundColor: "rgba(15,23,42,0.06)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#0F172A",
									fontWeight: 700,
									fontSize: 10,
								}}
							>
								{index + 1}
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
								<span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{truncateText(getItemTitle(item), 22)}</span>
								<span style={{ fontSize: 13, color: "rgba(15,23,42,0.58)" }}>{getItemMetric(item)}</span>
							</div>
						</div>
						<span style={{ fontSize: 15, fontWeight: 700, color: accentColor, textAlign: "right" }}>{getItemRevenue(item)}</span>
					</div>
				))
			) : (
				<div
					style={{
						display: "flex",
						minHeight: 138,
						alignItems: "center",
						justifyContent: "center",
						textAlign: "center",
						color: "rgba(15,23,42,0.52)",
						fontSize: 15,
					}}
				>
					{getEmptyLabel(type)}
				</div>
			)}
		</ReportCard>
	);
}
