import { formatCurrency, formatNumber } from "@/lib/reports/formatters";
import { getComparisonMeta, getPrimaryGradient } from "@/lib/reports/theme-utils";
import type { TCampaignReportPayload } from "@/lib/reports/types";

type CampaignHeroCardProps = {
	campaign: TCampaignReportPayload["campaign"];
	theme: TCampaignReportPayload["theme"];
	hasActivity: boolean;
};

function HeroChip({ value, label, foreground }: { value: string; label: string; foreground: string }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 2,
				padding: "12px 18px",
				borderRadius: 18,
				backgroundColor: "rgba(255,255,255,0.16)",
				border: "1px solid rgba(255,255,255,0.22)",
			}}
		>
			<span style={{ fontSize: 30, fontWeight: 700, color: foreground }}>{value}</span>
			<span style={{ fontSize: 15, color: foreground, opacity: 0.82 }}>{label}</span>
		</div>
	);
}

export function CampaignHeroCard({ campaign, theme, hasActivity }: CampaignHeroCardProps) {
	const comparison = getComparisonMeta(campaign.receitaAtribuida.atual, campaign.receitaAtribuida.anterior);
	const heroGradient = getPrimaryGradient(theme.primary);
	const fg = theme.primaryForeground;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 26,
				padding: 36,
				borderRadius: 30,
				background: heroGradient,
				color: fg,
				boxShadow: "0 26px 58px rgba(15,23,42,0.18)",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					position: "absolute",
					inset: 0,
					backgroundImage: `radial-gradient(circle, ${fg}14 1px, transparent 1px)`,
					backgroundSize: "20px 20px",
					opacity: 0.3,
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: -130,
					right: -50,
					width: 340,
					height: 340,
					borderRadius: 999,
					background: "radial-gradient(circle, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 68%)",
				}}
			/>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
					<span style={{ fontSize: 16, letterSpacing: 1.8, textTransform: "uppercase", opacity: 0.86 }}>Receita atribuída às campanhas</span>
					<span style={{ fontSize: 66, fontWeight: 700, lineHeight: 1 }}>{formatCurrency(campaign.receitaAtribuida.atual)}</span>
					<span style={{ fontSize: 17, opacity: 0.82 }}>
						{hasActivity
							? `${formatNumber(campaign.conversoes.atual)} conversões geradas pelo motor de campanhas`
							: "Nenhuma campanha converteu neste período"}
					</span>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						gap: 8,
						padding: "16px 18px",
						borderRadius: 20,
						backgroundColor: "rgba(255,255,255,0.94)",
						minWidth: 250,
					}}
				>
					<span style={{ fontSize: 13, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(15,23,42,0.5)" }}>vs. período anterior</span>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								padding: "6px 12px",
								borderRadius: 999,
								backgroundColor: comparison.tone.background,
								color: comparison.tone.color,
							}}
						>
							<span style={{ fontSize: 15, fontWeight: 700 }}>{comparison.icon}</span>
							<span style={{ fontSize: 15, fontWeight: 700 }}>{comparison.deltaLabel}</span>
						</div>
					</div>
					<span style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{comparison.label}</span>
				</div>
			</div>

			<div style={{ display: "flex", gap: 14 }}>
				<HeroChip value={formatNumber(campaign.clientesRecuperados)} label="Clientes recuperados" foreground={fg} />
				<HeroChip value={formatNumber(campaign.clientesAcelerados)} label="Compras aceleradas" foreground={fg} />
				<HeroChip value={formatNumber(campaign.clientesImpactados)} label="Clientes impactados" foreground={fg} />
			</div>
		</div>
	);
}
