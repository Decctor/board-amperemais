import { cn } from "@/lib/utils";
import { CAMPEOES_FREQUENCY_IMPACT, CAMPEOES_MONETARY_IMPACT } from "../campeoes-data";
import type { CampeoesLayoutTokens } from "../scale";

const PANELS = [
	{
		title: "Impacto na Frequência",
		rows: [
			{ label: "Compras aceleradas", value: String(CAMPEOES_FREQUENCY_IMPACT.accelerated), positive: true },
			{ label: "Compras atrasadas", value: String(CAMPEOES_FREQUENCY_IMPACT.delayed), positive: false },
			{ label: "Antecipação média", value: CAMPEOES_FREQUENCY_IMPACT.averageAnticipation, positive: true },
		],
	},
	{
		title: "Impacto no Ticket",
		rows: [
			{ label: "Acima do ticket médio", value: String(CAMPEOES_MONETARY_IMPACT.aboveAverage), positive: true },
			{ label: "Abaixo do ticket médio", value: String(CAMPEOES_MONETARY_IMPACT.belowAverage), positive: false },
			{ label: "Variação média", value: CAMPEOES_MONETARY_IMPACT.averageVariation, positive: true },
		],
	},
] as const;

type CampeoesImpactPanelsProps = {
	tokens: CampeoesLayoutTokens;
	className?: string;
	/** Preenche a altura do pai e divide o espaço entre os dois painéis */
	fillHeight?: boolean;
};

export function CampeoesImpactPanels({ tokens, className, fillHeight = false }: CampeoesImpactPanelsProps) {
	const { t, radiusMd } = tokens;

	return (
		<div
			data-design-role="campeoes-impact-panels"
			className={cn(className)}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: Math.round(14 * t),
				width: "100%",
				minWidth: 0,
				minHeight: fillHeight ? 0 : undefined,
				flex: fillHeight ? 1 : undefined,
				height: fillHeight ? "100%" : undefined,
			}}
		>
			{PANELS.map((panel) => (
				<div
					key={panel.title}
					style={{
						minWidth: 0,
						minHeight: fillHeight ? 0 : undefined,
						flex: fillHeight ? "1 1 0" : undefined,
						display: fillHeight ? "flex" : undefined,
						flexDirection: fillHeight ? "column" : undefined,
						justifyContent: fillHeight ? "center" : undefined,
						borderRadius: radiusMd,
						background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
						boxShadow: "0 10px 36px rgba(0,0,0,0.18)",
						padding: `${Math.round(16 * (t))}px ${Math.round(18 * t)}px`,
						border: "1px solid rgba(255,255,255,0.75)",
					}}
				>
					<div
						style={{
							fontSize: Math.round(8 * t),
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: "#94A3B8",
							marginBottom: Math.round(10 * t),
						}}
					>
						{panel.title}
					</div>
					{panel.rows.map((row, idx) => (
						<div
							key={row.label}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: Math.round(8 * t),
								padding: `${Math.round(7 * t)}px 0`,
								borderBottom: idx < panel.rows.length - 1 ? "1px solid #F1F5F9" : undefined,
							}}
						>
							<span
								style={{
									fontSize: Math.round(11 * t),
									fontWeight: 600,
									color: "#334155",
									minWidth: 0,
									lineHeight: 1.35,
								}}
							>
								{row.label}
							</span>
							<span
								style={{
									fontSize: Math.round(12 * t),
									fontWeight: 800,
									color: row.positive ? "#059669" : "#DC2626",
									fontVariantNumeric: "tabular-nums",
									flexShrink: 0,
								}}
							>
								{row.value}
							</span>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
