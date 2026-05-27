import { cn } from "@/lib/utils";
import type { CampeoesLayoutTokens } from "../scale";

export type CampeoesDistributionItem = {
	type: string;
	count: number;
	percentage: number;
	revenue: string;
	color: string;
};

type CampeoesDistributionCardProps = {
	tokens: CampeoesLayoutTokens;
	items: CampeoesDistributionItem[];
	showTaglineBand: boolean;
	taglineFontMultiplier: number;
	tagline: string;
	className?: string;
	/** Preenche a altura do pai (ex.: coluna com align-items: stretch na grid) */
	fillHeight?: boolean;
};

export function CampeoesDistributionCard({
	tokens,
	items,
	showTaglineBand,
	taglineFontMultiplier,
	tagline,
	className,
	fillHeight = false,
}: CampeoesDistributionCardProps) {
	const { t, radiusMd } = tokens;

	const mainPaddingBottom = showTaglineBand ? Math.round(16 * t) : Math.round(18 * t);

	return (
		<div
			data-design-role="campeoes-distribution-wrap"
			className={cn(className)}
			style={{
				display: "flex",
				flexDirection: "column",
				flexShrink: fillHeight ? 1 : 0,
				flexGrow: fillHeight ? 1 : 0,
				minHeight: fillHeight ? 0 : undefined,
				height: fillHeight ? "100%" : undefined,
			}}
		>
			<div
				style={{
					borderRadius: radiusMd,
					background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
					boxShadow: "0 14px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.65)",
					display: "flex",
					flexDirection: "column",
					flex: fillHeight ? 1 : undefined,
					flexShrink: fillHeight ? 1 : 0,
					minHeight: fillHeight ? 0 : undefined,
					height: fillHeight ? "100%" : undefined,
				}}
			>
				<div
					style={{
						flex: fillHeight ? 1 : undefined,
						minHeight: fillHeight ? 0 : undefined,
						display: fillHeight ? "flex" : undefined,
						flexDirection: fillHeight ? "column" : undefined,
						padding: `${Math.round(22 * t)}px ${Math.round(24 * t)}px`,
						paddingBottom: mainPaddingBottom,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: Math.round(14 * t),
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontSize: Math.round(10 * t),
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.11em",
								color: "#94A3B8",
							}}
						>
							Conversões por Tipo
						</span>
						<span style={{ fontSize: Math.round(11 * t), color: "#CBD5E1", fontWeight: 300 }}>◆</span>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: Math.round(10 * t),
							flex: fillHeight ? 1 : undefined,
							minHeight: fillHeight ? 0 : undefined,
						}}
					>
						{items.map((item) => (
							<div key={item.type} style={{ display: "flex", flexDirection: "column", gap: Math.round(5 * t) }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: Math.round(8 * t),
										minWidth: 0,
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: Math.round(8 * t), minWidth: 0 }}>
										<div
											style={{
												width: Math.round(10 * t),
												height: Math.round(10 * t),
												borderRadius: "50%",
												backgroundColor: item.color,
												flexShrink: 0,
												boxShadow: `0 0 0 2px ${item.color}33`,
											}}
										/>
										<span
											style={{
												fontSize: Math.round(12 * t),
												fontWeight: 700,
												color: "#0F172A",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{item.type}
										</span>
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: Math.round(10 * t),
											flexShrink: 0,
										}}
									>
										<span style={{ fontSize: Math.round(10 * t), color: "#64748B", fontWeight: 600 }}>{item.count} conv.</span>
										<span
											style={{
												fontSize: Math.round(11 * t),
												fontWeight: 800,
												color: item.color,
												minWidth: Math.round(48 * t),
												textAlign: "right",
												fontVariantNumeric: "tabular-nums",
											}}
										>
											{item.percentage.toFixed(2).replace(".", ",")}%
										</span>
										<span
											style={{
												fontSize: Math.round(10 * t),
												color: "#64748B",
												minWidth: Math.round(88 * t),
												textAlign: "right",
												fontWeight: 600,
												fontVariantNumeric: "tabular-nums",
											}}
										>
											{item.revenue}
										</span>
									</div>
								</div>
								<div
									style={{
										width: "100%",
										height: Math.max(7, Math.round(9 * t)),
										backgroundColor: "#EEF2F6",
										borderRadius: 999,
										overflow: "hidden",
									}}
								>
									<div
										style={{
											width: `${Math.min(item.percentage, 100)}%`,
											height: "100%",
											borderRadius: 999,
											background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}E6 100%)`,
											boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35)`,
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</div>

				{showTaglineBand && (
					<div
						style={{
							flexShrink: 0,
							padding: `${Math.round(12 * t)}px ${Math.round(20 * t)}px`,
							borderTop: "1px solid #E2E8F0",
							background: "linear-gradient(180deg, #F1F5F9 0%, #E8EEF4 100%)",
							borderBottomLeftRadius: radiusMd,
							borderBottomRightRadius: radiusMd,
						}}
					>
						<p
							style={{
								margin: 0,
								fontSize: Math.round(taglineFontMultiplier * t),
								fontWeight: 600,
								color: "#475569",
								textAlign: "center",
								letterSpacing: "0.02em",
								lineHeight: 1.45,
							}}
						>
							{tagline}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
