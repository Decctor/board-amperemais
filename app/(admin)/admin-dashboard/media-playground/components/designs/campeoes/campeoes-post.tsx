import LogoWhite from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL.svg";
import { CAMPEOES_CAMPAIGN, CAMPEOES_CONVERSION_DISTRIBUTION, CAMPEOES_FREQUENCY_IMPACT, CAMPEOES_MONETARY_IMPACT } from "./campeoes-data";

type CampeoesPostProps = { width: number; height: number };

/** Brand background — Figma: 0% #24549C → 100% #0C1D36 (vertical canvas = top → bottom) */
const BG_GRADIENT = "linear-gradient(180deg, #24549C 0%, #0C1D36 100%)";

/** Vertical rhythm vs 1080×1350 reference */
function getVerticalScale(height: number) {
	const t = (height * 1.2) / 1350;
	return {
		t,
		padX: Math.max(40, Math.round(48 * t)),
		padTop: Math.round(44 * t),
		padBottom: Math.round(130 * t),
		sectionGap: Math.round(22 * t),
		radiusLg: Math.round(20 * t),
		radiusMd: Math.round(16 * t),
	};
}

const DELIVERY_KPIS = [
	{ label: "Clientes Convertidos", value: "36" },
	{ label: "Mensagens Entregues", value: "140" },
	{ label: "Ticket Médio Conv.", value: "R$ 204,23" },
	{ label: "Tempo Médio Conv.", value: "111,6h" },
] as const;

const TAGLINE = "Dados que viram relacionamento — e relacionamento que viram receita.";

/** Corpo do callout — o botão “Venha já testar” fica à direita (estilo Comece grátis). */
const HERO_CTA_BODY = (
	<>
		Também quer <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>campanhas automáticas no WhatsApp</strong>
		{" — "}com mensagens no timing certo e benefícios como <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>cashback adicional</strong>? <br /> Com
		o <strong style={{ color: "#FFCD2E", fontWeight: 800 }}>RecompraCRM</strong>, você pode.
	</>
);

export default function CampeoesPost({ width, height }: CampeoesPostProps) {
	const isSquare = height <= 1080;
	const isReels = height >= 1920;
	const isFeed = !isSquare && !isReels;
	const { t, padX, padTop, padBottom, sectionGap, radiusLg, radiusMd } = getVerticalScale(height);

	const dist = isSquare && height < 1180 ? CAMPEOES_CONVERSION_DISTRIBUTION.slice(0, 3) : CAMPEOES_CONVERSION_DISTRIBUTION;

	const headlineSize = Math.round((isSquare ? 52 : isReels ? 60 : 60) * Math.min(1, t + 3));
	const bodySize = Math.round((isSquare ? 15 : 20) * Math.min(1, t + 0.06));
	const ctaLineSize = Math.round((isSquare ? 13 : 20) * Math.min(1, t + 0.04));

	const fontStack = `var(--font-raleway), ui-sans-serif, system-ui, sans-serif`;

	/** Hero width — leave room for headline so nothing collides at 1080px */
	const heroBasis = Math.round((isSquare ? 292 : isFeed ? 332 : 352) * Math.min(1.08, 0.88 + t * 0.12));

	/** Footer logo: legível na exportação */
	const logoHeightPx = Math.round((isSquare ? 46 : isReels ? 58 : 52) * Math.min(1.15, 0.92 + t * 0.08));

	const showDensityStrip = isReels || isFeed || isSquare;
	const showTaglineBand = isReels || isFeed || isSquare;

	return (
		<div
			style={{
				width,
				height,
				position: "relative",
				overflow: "hidden",
				fontFamily: fontStack,
				background: BG_GRADIENT,
			}}
		>
			{/* ─── Atmosphere (subtle, on brand) ─── */}
			<div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: `
							radial-gradient(ellipse 80% 50% at 100% 0%, rgba(255, 200, 80, 0.08) 0%, transparent 52%),
							radial-gradient(ellipse 55% 40% at 0% 100%, rgba(15, 40, 80, 0.45) 0%, transparent 50%)
						`,
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: 0.4,
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
						backgroundSize: "180px 180px",
						mixBlendMode: "overlay",
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "repeating-linear-gradient(-28deg, transparent, transparent 56px, rgba(255,255,255,0.014) 56px, rgba(255,255,255,0.014) 57px)",
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.25) 0%, transparent 55%)",
					}}
				/>
			</div>

			{/* ─── Main column (gap avoids stacked margin / overlap bugs) ─── */}
			<div
				style={{
					position: "relative",
					zIndex: 1,
					height: "100%",
					display: "flex",
					flexDirection: "column",
					gap: sectionGap,
					padding: `${padTop}px ${padX}px ${padBottom}px`,
					boxSizing: "border-box",
				}}
			>
				{/* Top: headline + hero — padding-bottom absorbs card rotation */}
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: Math.round(20 * t),
						paddingBottom: Math.round(18 * t),
						boxSizing: "border-box",
					}}
				>
					<div style={{ flex: "1 1 0", minWidth: 0, maxWidth: width - padX * 2 - heroBasis - Math.round(20 * t) }}>
						<h1
							style={{
								fontSize: headlineSize,
								fontWeight: 800,
								color: "#FAFAFA",
								lineHeight: 1.06,
								margin: 0,
								letterSpacing: "-0.032em",
								textShadow: "0 4px 28px rgba(0,0,0,0.35)",
							}}
						>
							Seus melhores
							<br />
							clientes merecem
							<br />
							tratamento{" "}
							<span
								style={{
									color: "#FFCD2E",
									textDecoration: "underline",
									textDecorationColor: "rgba(255, 205, 46, 0.55)",
									textUnderlineOffset: "0.12em",
								}}
							>
								VIP
							</span>
							.
						</h1>
						<p
							style={{
								margin: `${Math.round(18 * t)}px 0 0`,
								fontSize: bodySize,
								fontWeight: 500,
								color: "rgba(252,252,252,0.78)",
								lineHeight: 1.55,
							}}
						>
							A Ampère+ criou um clube exclusivo para seus campeões de compra com o <span style={{ color: "#FFCD2E", fontWeight: 800 }}>RecompraCRM</span> e
							os resultados falam por si.
						</p>
					</div>

					<div
						style={{
							flex: `0 0 ${heroBasis}px`,
							width: heroBasis,
							minWidth: 0,
							borderRadius: radiusLg,
							background: "linear-gradient(165deg, #FFFFFF 0%, #F4F7FB 100%)",
							boxShadow: "0 18px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.7), 0 0 80px rgba(0,0,0,0.12)",
							transform: "rotate(-0.9deg)",
						}}
					>
						<div style={{ padding: `${Math.round(20 * t)}px ${Math.round(22 * t)}px` }}>
							<div
								style={{
									fontSize: Math.round(9 * t),
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.1em",
									color: "#9CA3AF",
									marginBottom: Math.round(10 * t),
								}}
							>
								Receita Atribuída
							</div>
							<div
								style={{
									fontSize: Math.round(34 * t),
									fontWeight: 800,
									color: "#1E3A5F",
									letterSpacing: "-0.03em",
									lineHeight: 1,
								}}
							>
								R$ 29.408,63
							</div>
						</div>
						<div
							style={{
								display: "flex",
								borderTop: "1px solid rgba(226,232,240,0.95)",
								background: "linear-gradient(180deg, #E8F1FF 0%, #DDE9FC 100%)",
								borderRadius: `0 0 ${radiusLg}px ${radiusLg}px`,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									flex: 1,
									minWidth: 0,
									padding: `${Math.round(12 * t)}px ${Math.round(14 * t)}px`,
									borderRight: "1px solid rgba(203,213,225,0.55)",
								}}
							>
								<div
									style={{
										fontSize: Math.round(8 * t),
										fontWeight: 800,
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										color: "#64748B",
										marginBottom: Math.round(5 * t),
									}}
								>
									Taxa de Conversão
								</div>
								<div
									style={{
										fontSize: Math.round(23 * t),
										fontWeight: 800,
										color: "#059669",
										letterSpacing: "-0.02em",
									}}
								>
									75,39%
								</div>
							</div>
							<div style={{ flex: 1, minWidth: 0, padding: `${Math.round(12 * t)}px ${Math.round(14 * t)}px` }}>
								<div
									style={{
										fontSize: Math.round(8 * t),
										fontWeight: 800,
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										color: "#64748B",
										marginBottom: Math.round(5 * t),
									}}
								>
									Conversões
								</div>
								<div
									style={{
										fontSize: Math.round(23 * t),
										fontWeight: 800,
										color: "#1E3A5F",
										letterSpacing: "-0.02em",
									}}
								>
									144
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* CTA em largura total (entre o bloco herói e os KPIs) */}
				<div
					style={{
						width: "100%",
						alignSelf: "stretch",
						boxSizing: "border-box",
						padding: `${Math.round(14 * t)}px ${Math.round(16 * t)}px`,
						borderRadius: Math.round(12 * t),
						border: "1px solid rgba(255, 205, 46, 0.22)",
						borderLeftWidth: Math.max(3, Math.round(4 * t)),
						borderLeftColor: "#FFCD2E",
						background: "linear-gradient(105deg, rgba(255,255,255,0.09) 0%, rgba(6,18,38,0.55) 100%)",
						boxShadow: "0 10px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
						display: "flex",
						flexDirection: isSquare ? "column" : "row",
						alignItems: isSquare ? "stretch" : "center",
						justifyContent: "space-between",
						gap: Math.round(14 * t),
					}}
				>
					<p
						style={{
							margin: 0,
							flex: "1 1 auto",
							minWidth: 0,
							fontSize: ctaLineSize,
							fontWeight: 500,
							color: "rgba(248,250,252,0.9)",
							lineHeight: 1.52,
							letterSpacing: "-0.01em",
						}}
					>
						{HERO_CTA_BODY}
					</p>
					<div
						style={{
							flexShrink: 0,
							alignSelf: isSquare ? "stretch" : "center",
							textAlign: "center",
							background: "linear-gradient(180deg, #FFDC4A 0%, #FFCD2E 35%, #FFB800 100%)",
							color: "#0A0F18",
							fontWeight: 800,
							fontSize: Math.round((isSquare ? 11 : 12) * t),
							padding: `${Math.round(12 * t)}px ${Math.round(18 * t)}px`,
							borderRadius: Math.round(10 * t),
							letterSpacing: "0.06em",
							whiteSpace: "nowrap",
							textTransform: "uppercase",
							boxShadow:
								"0 0 0 1px rgba(255,255,255,0.45) inset, 0 2px 0 rgba(255,255,255,0.35) inset, 0 12px 32px rgba(255,184,0,0.42), 0 0 28px rgba(255,205,46,0.35)",
						}}
					>
						Venha já testar
					</div>
				</div>

				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						alignSelf: "flex-start",
						gap: Math.round(10 * t),
						backgroundColor: "rgba(6, 18, 38, 0.72)",
						border: "1px solid rgba(255,255,255,0.14)",
						borderRadius: 999,
						padding: `${Math.round(8 * t)}px ${Math.round(18 * t)}px ${Math.round(8 * t)}px ${Math.round(14 * t)}px`,
						boxShadow: "0 8px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							width: Math.round(8 * t),
							height: Math.round(8 * t),
							borderRadius: "50%",
							backgroundColor: "#34D399",
							boxShadow: "0 0 0 3px rgba(52,211,153,0.22)",
							flexShrink: 0,
						}}
					/>
					<span
						style={{
							fontSize: Math.round(11 * t),
							fontWeight: 800,
							color: "#F8FAFC",
							letterSpacing: "0.04em",
						}}
					>
						CLUBE CAMPEÕES AMPÈRE+
					</span>
					<div
						style={{
							backgroundColor: "rgba(52,211,153,0.14)",
							border: "1px solid rgba(52,211,153,0.32)",
							borderRadius: 8,
							padding: `${Math.round(3 * t)}px ${Math.round(9 * t)}px`,
						}}
					>
						<span
							style={{
								fontSize: Math.round(9 * t),
								fontWeight: 800,
								color: "#6EE7B7",
								letterSpacing: "0.06em",
							}}
						>
							ATIVA
						</span>
					</div>
				</div>

				{/* Metric trio */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr",
						gap: Math.round(12 * t),
					}}
				>
					{[
						{
							label: "Impacto no Ticket",
							value: "+51,78%",
							valueColor: "#059669",
							accent: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
						},
						{
							label: "Clientes Alcançados",
							value: "99",
							valueColor: "#1E3A5F",
							accent: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
						},
						{
							label: "Antecipação Média",
							value: "10,7 dias",
							valueColor: "#D4A012",
							accent: "linear-gradient(135deg, #FFFBF0 0%, #FFF6E0 100%)",
							borderAccent: "1px solid rgba(255, 185, 0, 0.35)",
						},
					].map((card) => (
						<div
							key={card.label}
							style={{
								borderRadius: radiusMd,
								background: card.accent,
								border: card.borderAccent ?? "1px solid rgba(255,255,255,0.65)",
								boxShadow: "0 10px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
								padding: `${Math.round(14 * t)}px ${Math.round(16 * t)}px`,
								minWidth: 0,
							}}
						>
							<div
								style={{
									fontSize: Math.round(8 * t),
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.09em",
									color: "#94A3B8",
									marginBottom: Math.round(6 * t),
								}}
							>
								{card.label}
							</div>
							<div
								style={{
									fontSize: Math.round(26 * t),
									fontWeight: 800,
									color: card.valueColor,
									letterSpacing: "-0.025em",
									lineHeight: 1.1,
								}}
							>
								{card.value}
							</div>
						</div>
					))}
				</div>

				{/* Distribution — no flex-grow: avoids squashing & “floating” overlap in Reels */}
				<div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
					<div
						style={{
							borderRadius: radiusMd,
							background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
							boxShadow: "0 14px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.65)",
							display: "flex",
							flexDirection: "column",
							flexShrink: 0,
						}}
					>
						<div
							style={{
								padding: `${Math.round(22 * t)}px ${Math.round(24 * t)}px`,
								paddingBottom: showTaglineBand ? Math.round(16 * t) : Math.round(18 * t),
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: Math.round(14 * t),
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

							<div style={{ display: "flex", flexDirection: "column", gap: Math.round(10 * t) }}>
								{dist.map((item) => (
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
									padding: `${Math.round(12 * t)}px ${Math.round(20 * t)}px`,
									borderTop: "1px solid #E2E8F0",
									background: "linear-gradient(180deg, #F1F5F9 0%, #E8EEF4 100%)",
								}}
							>
								<p
									style={{
										margin: 0,
										fontSize: Math.round((isSquare ? 11 : 12) * t),
										fontWeight: 600,
										color: "#475569",
										textAlign: "center",
										letterSpacing: "0.02em",
										lineHeight: 1.45,
									}}
								>
									{TAGLINE}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Reels: impact panels — grid + minWidth:0 prevents sideways overlap */}
				{isReels && (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: Math.round(14 * t),
							width: "100%",
						}}
					>
						{[
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
						].map((panel) => (
							<div
								key={panel.title}
								style={{
									minWidth: 0,
									borderRadius: radiusMd,
									background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
									boxShadow: "0 10px 36px rgba(0,0,0,0.18)",
									padding: `${Math.round(20 * t)}px ${Math.round(22 * t)}px`,
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
				)}

				{/* Delivery KPIs — all formats for density; square = 2×2 */}
				{showDensityStrip && !isReels && !isSquare && (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: isSquare ? "1fr 1fr" : "repeat(4, 1fr)",
							gap: Math.round(10 * t),
							width: "100%",
						}}
					>
						{DELIVERY_KPIS.map((item) => (
							<div
								key={item.label}
								style={{
									minWidth: 0,
									borderRadius: radiusMd,
									backgroundColor: "rgba(255,255,255,0.08)",
									border: "1px solid rgba(255,255,255,0.14)",
									padding: `${Math.round(20 * t)}px ${Math.round(16 * t)}px`,
									boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
								}}
							>
								<div
									style={{
										fontSize: Math.round(8 * t),
										fontWeight: 800,
										textTransform: "uppercase",
										letterSpacing: "0.07em",
										color: "rgba(248,250,252,0.8)",
										marginBottom: Math.round(5 * t),
										lineHeight: 1.25,
									}}
								>
									{item.label}
								</div>
								<div
									style={{
										fontSize: Math.round((isSquare ? 18 : isFeed ? 19 : 20) * t),
										fontWeight: 800,
										color: "#F8FAFC",
										letterSpacing: "-0.02em",
										fontVariantNumeric: "tabular-nums",
										lineHeight: 1.15,
									}}
								>
									{item.value}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<div
				style={{
					position: "absolute",
					bottom: Math.round((isSquare ? 24 : isReels ? 36 : 30) * Math.min(1, t)),
					left: padX,
					right: padX,
					zIndex: 10,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: Math.round(16 * t),
					paddingTop: Math.round(14 * t),
					borderTop: "1px solid rgba(255,255,255,0.12)",
				}}
			>
				<img
					src={LogoWhite.src}
					alt="RecompraCRM"
					style={{
						height: logoHeightPx,
						width: "auto",
						maxWidth: "25%",
						objectFit: "contain",
						objectPosition: "left center",
						display: "block",
					}}
					crossOrigin="anonymous"
				/>
				<div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * t), flexShrink: 0 }}>
					<span style={{ fontSize: Math.round(16 * t), fontWeight: 500, color: "rgba(248,250,252,0.55)" }}>Conheça e</span>
					<div
						style={{
							background: "linear-gradient(180deg, #FFCD2E 0%, #FFB800 100%)",
							color: "#0A0F18",
							fontWeight: 800,
							fontSize: Math.round(16 * t),
							padding: `${Math.round(10 * t)}px ${Math.round(24 * t)}px`,
							borderRadius: Math.round(10 * t),
							letterSpacing: "-0.02em",
							whiteSpace: "nowrap",
							boxShadow: "0 10px 28px rgba(255,184,0,0.3), inset 0 1px 0 rgba(255,255,255,0.45)",
						}}
					>
						Comece grátis
					</div>
				</div>
			</div>
		</div>
	);
}
