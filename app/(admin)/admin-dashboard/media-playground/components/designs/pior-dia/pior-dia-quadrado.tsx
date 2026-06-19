import { WhatsappIcon } from "@/components/icons";
import LogoWhite from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL.svg";
import Image from "next/image";
type PiorDiaQuadradoPostProps = { width: number; height: number };

const FONT_STACK = `var(--font-raleway), ui-sans-serif, system-ui, sans-serif`;
const BG_GRADIENT = "linear-gradient(180deg, #355a93 0%, #1d3358 38%, #12233f 100%)";

const SEGMENTS = [
	{ label: "LEAIS", color: "#A78BFA", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
	{ label: "CAMPEÕES", color: "#FFCD2E", bg: "rgba(255,205,46,0.18)", border: "rgba(255,205,46,0.4)" },
] as const;

const TREND_POINTS = [22, 36, 58, 88] as const;

function px(value: number, scale: number) {
	return Math.round(value * scale);
}

function WorkflowCard({
	scale,
	accent,
	number,
	title,
	subtitle,
	children,
}: {
	scale: number;
	accent: { ring: string; bg: string; text: string; glow: string };
	number: string;
	title: string;
	subtitle: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,250,0.98) 100%)",
				borderRadius: px(22, scale),
				border: "1px solid rgba(255,255,255,0.9)",
				boxShadow: `0 ${px(16, scale)}px ${px(42, scale)}px rgba(6,18,38,0.2), 0 0 0 1px rgba(255,255,255,0.45) inset`,
				padding: `${px(14, scale)}px ${px(14, scale)}px ${px(16, scale)}px`,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: px(10, scale),
					marginBottom: px(12, scale),
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: px(10, scale) }}>
					<div
						style={{
							display: "grid",
							placeItems: "center",
							width: px(30, scale),
							height: px(30, scale),
							borderRadius: px(10, scale),
							border: `1.5px solid ${accent.ring}`,
							background: accent.bg,
							color: accent.text,
							fontSize: px(12, scale),
							fontWeight: 900,
							boxShadow: `0 0 ${px(20, scale)}px ${accent.glow}`,
						}}
					>
						{number}
					</div>
					<div>
						<div
							style={{
								fontSize: px(16, scale),
								fontWeight: 900,
								letterSpacing: "-0.03em",
								color: "#172033",
							}}
						>
							{title}
						</div>
						<div
							style={{
								marginTop: px(2, scale),
								fontSize: px(10.5, scale),
								fontWeight: 700,
								letterSpacing: "0.06em",
								textTransform: "uppercase",
								color: "rgba(23,32,51,0.42)",
							}}
						>
							{subtitle}
						</div>
					</div>
				</div>
			</div>

			{children}
		</div>
	);
}

function Connector({ scale, from, to }: { scale: number; from: string; to: string }) {
	return (
		<div
			style={{
				height: px(26, scale),
				position: "relative",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					width: px(2, scale),
					height: "100%",
					borderRadius: 999,
					background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
					opacity: 0.9,
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: px(3, scale),
					width: 0,
					height: 0,
					borderLeft: `${px(5, scale)}px solid transparent`,
					borderRight: `${px(5, scale)}px solid transparent`,
					borderTop: `${px(7, scale)}px solid ${to}`,
					filter: `drop-shadow(0 0 ${px(6, scale)}px ${to}66)`,
				}}
			/>
		</div>
	);
}

function TrendChart({ scale }: { scale: number }) {
	const chartWidth = px(142, scale);
	const chartHeight = px(74, scale);
	const max = Math.max(...TREND_POINTS);
	const min = Math.min(...TREND_POINTS);
	const points = TREND_POINTS.map((point, index) => {
		const x = (index / (TREND_POINTS.length - 1)) * chartWidth;
		const y = chartHeight - ((point - min) / (max - min || 1)) * (chartHeight - px(10, scale)) - px(5, scale);
		return `${x},${y}`;
	}).join(" ");

	return (
		<svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
			<defs>
				<linearGradient id="trend-line" x1="0" y1={chartHeight} x2={chartWidth} y2="0">
					<stop stopColor="#14B8A6" />
					<stop offset="1" stopColor="#6EE7B7" />
				</linearGradient>
				<linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2={chartHeight}>
					<stop offset="0" stopColor="rgba(16,185,129,0.26)" />
					<stop offset="1" stopColor="rgba(16,185,129,0)" />
				</linearGradient>
			</defs>

			{[0.2, 0.5, 0.8].map((ratio) => (
				<line
					key={ratio}
					x1="0"
					x2={chartWidth}
					y1={chartHeight * ratio}
					y2={chartHeight * ratio}
					stroke="rgba(148,163,184,0.28)"
					strokeDasharray={`${px(4, scale)} ${px(4, scale)}`}
				/>
			))}

			<path d={`M 0 ${chartHeight} L ${points} L ${chartWidth} ${chartHeight} Z`} fill="url(#trend-fill)" opacity="0.9" />
			<polyline points={points} stroke="url(#trend-line)" strokeWidth={px(4, scale)} strokeLinecap="round" strokeLinejoin="round" />
			<circle
				cx={chartWidth}
				cy={Number(points.split(" ").at(-1)?.split(",")[1] ?? chartHeight / 2)}
				r={px(5, scale)}
				fill="#34D399"
				stroke="#D1FAE5"
				strokeWidth={px(2, scale)}
			/>
		</svg>
	);
}

export default function PiorDiaQuadradoPost({ width, height }: PiorDiaQuadradoPostProps) {
	const scale = Math.min(width / 1080, height / 1080);

	const padX = px(40, scale);
	const padTop = px(36, scale);
	const padBottom = px(34, scale);
	const workflowWidth = px(512, scale);
	const workflowTop = px(38, scale);
	const logoHeight = px(40, scale);

	return (
		<div
			className="relative overflow-hidden"
			style={{
				width,
				height,
				fontFamily: FONT_STACK,
				background: BG_GRADIENT,
			}}
		>
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(circle at 22% 18%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 82% 22%, rgba(255,205,46,0.12) 0%, rgba(255,205,46,0) 22%), radial-gradient(circle at 72% 72%, rgba(16,185,129,0.09) 0%, rgba(16,185,129,0) 28%)",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					opacity: 0.16,
					backgroundImage:
						"linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
					backgroundSize: `${px(3, scale)}px ${px(3, scale)}px, ${px(3, scale)}px ${px(3, scale)}px`,
					mixBlendMode: "soft-light",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 48%, rgba(10,18,30,0.08) 100%)",
				}}
			/>

			<div
				style={{
					padding: `${padTop}px ${padX}px ${padBottom}px`,
					boxSizing: "border-box",
				}}
				className="flex flex-col gap-3 h-full w-full"
			>
				<div className="flex py-12 items-stretch relative flex-1 grow w-full gap-12">
					<div className="flex flex-col gap-3 flex-1 justify-between">
						<div>
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: px(8, scale),
									padding: `${px(6, scale)}px ${px(14, scale)}px`,
									borderRadius: 999,
									border: "1px solid rgba(255,205,46,0.32)",
									background: "linear-gradient(120deg, rgba(255,205,46,0.18) 0%, rgba(16,185,129,0.14) 100%)",
									boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
								}}
							>
								<div
									style={{
										width: px(12, scale),
										height: px(12, scale),
										clipPath: "polygon(55% 0%, 0% 55%, 42% 55%, 35% 100%, 100% 40%, 58% 40%)",
										background: "#FFCD2E",
									}}
								/>
								<span
									style={{
										fontSize: px(11, scale),
										fontWeight: 900,
										letterSpacing: "0.14em",
										textTransform: "uppercase",
										color: "#FFE17F",
									}}
								>
									Automação inteligente
								</span>
							</div>

							<h1
								style={{
									margin: `${px(18, scale)}px 0 0`,
									fontSize: px(66, scale),
									fontWeight: 900,
									lineHeight: 0.98,
									letterSpacing: "-0.05em",
									color: "#FAFAFA",
									textShadow: `0 ${px(4, scale)}px ${px(22, scale)}px rgba(0,0,0,0.28)`,
								}}
							>
								Sua quarta fraca
								<br />
								<span style={{ color: "#FAFAFA" }}>virou </span>
								<span style={{ color: "#FFCD2E" }}>dia campeão.</span>
							</h1>

							<p
								style={{
									margin: `${px(18, scale)}px 0 0`,
									maxWidth: px(398, scale),
									fontSize: px(18, scale),
									fontWeight: 500,
									lineHeight: 1.54,
									letterSpacing: "-0.01em",
									color: "rgba(248,250,252,0.86)",
								}}
							>
								Uma campanha que <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>roda sozinha</strong> no seu pior dia da semana feita em{" "}
								<strong style={{ color: "#FFCD2E", fontWeight: 800 }}>3 passos</strong> e ativada automaticamente pelo{" "}
								<span className="inline-block align-middle px-2">
									<Image src={LogoWhite} alt="RecompraCRM" width={180} height={125} />
								</span>
							</p>
						</div>

						<div
							style={{
								marginTop: px(18, scale),
								width: "100%",
								padding: `${px(14, scale)}px ${px(16, scale)}px`,
								borderRadius: px(14, scale),
								border: "1px solid rgba(255,205,46,0.22)",
								borderLeft: `${px(4, scale)}px solid #FFCD2E`,
								background: "linear-gradient(105deg, rgba(255,255,255,0.1) 0%, rgba(6,18,38,0.58) 100%)",
								boxShadow: `0 ${px(10, scale)}px ${px(28, scale)}px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
							}}
						>
							<p
								style={{
									margin: 0,
									fontSize: px(17, scale),
									fontWeight: 500,
									lineHeight: 1.5,
									color: "rgba(248,250,252,0.92)",
								}}
							>
								Quer uma campanha que trabalha sozinha pra <strong style={{ color: "#FAFAFA", fontWeight: 800 }}>resgatar receita</strong> no seu pior dia?
							</p>
							<div
								style={{
									marginTop: px(14, scale),
									display: "grid",
									placeItems: "center",
									width: "100%",
									padding: `${px(13, scale)}px ${px(20, scale)}px`,
									borderRadius: px(11, scale),
									background: "linear-gradient(180deg, #FFDC4A 0%, #FFCD2E 34%, #FFB800 100%)",
									color: "#0A0F18",
									fontSize: px(14, scale),
									fontWeight: 900,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									boxShadow: "0 0 0 1px rgba(255,255,255,0.45) inset, 0 2px 0 rgba(255,255,255,0.35) inset, 0 12px 32px rgba(255,184,0,0.42)",
								}}
							>
								No RecompraCRM você pode
							</div>
						</div>
					</div>
					<div
						className="flex-1"
						style={{
							top: workflowTop,
							right: 0,
							width: workflowWidth,
							zIndex: 2,
						}}
					>
						<WorkflowCard
							scale={scale}
							number="01"
							title="VOCÊ CONFIGURA"
							subtitle="Uma única vez, em 2 minutos"
							accent={{
								ring: "#EF4444",
								bg: "rgba(239,68,68,0.12)",
								text: "#B91C1C",
								glow: "rgba(239,68,68,0.3)",
							}}
						>
							<div
								style={{
									borderRadius: px(16, scale),
									border: "1px solid rgba(239,68,68,0.18)",
									background: "linear-gradient(180deg, rgba(254,242,242,0.95) 0%, rgba(255,255,255,0.98) 100%)",
									padding: px(14, scale),
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: px(10, scale),
										padding: `${px(10, scale)}px ${px(12, scale)}px`,
										borderRadius: px(12, scale),
										background: "linear-gradient(180deg, rgba(255,82,82,0.08) 0%, rgba(255,82,82,0.14) 100%)",
										border: "1px solid rgba(239,68,68,0.16)",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: px(8, scale), minWidth: 0 }}>
										<div
											style={{
												padding: `${px(4, scale)}px ${px(8, scale)}px`,
												borderRadius: 999,
												background: "#EF4444",
												color: "#FFF7F7",
												fontSize: px(9, scale),
												fontWeight: 900,
												letterSpacing: "0.06em",
												textTransform: "uppercase",
											}}
										>
											Gatilho
										</div>
										<span
											style={{
												fontSize: px(12, scale),
												fontWeight: 900,
												color: "#DC2626",
												letterSpacing: "0.02em",
											}}
										>
											PIOR DIA DE VENDAS
										</span>
									</div>
									<div
										style={{
											padding: `${px(6, scale)}px ${px(10, scale)}px`,
											borderRadius: px(10, scale),
											background: "linear-gradient(180deg, #FF5C5C 0%, #EF4444 100%)",
											color: "white",
											fontSize: px(12, scale),
											fontWeight: 900,
											boxShadow: `0 ${px(8, scale)}px ${px(18, scale)}px rgba(239,68,68,0.28)`,
										}}
									>
										QUARTA
									</div>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: px(8, scale),
										marginTop: px(12, scale),
									}}
								>
									<span
										style={{
											fontSize: px(9, scale),
											fontWeight: 800,
											letterSpacing: "0.08em",
											textTransform: "uppercase",
											color: "rgba(23,32,51,0.45)",
										}}
									>
										Segmentos
									</span>
									{SEGMENTS.map((segment) => (
										<div
											key={segment.label}
											style={{
												padding: `${px(4, scale)}px ${px(9, scale)}px`,
												borderRadius: 999,
												border: `1px solid ${segment.border}`,
												background: segment.bg,
												color: segment.color,
												fontSize: px(9.5, scale),
												fontWeight: 900,
												letterSpacing: "0.06em",
												textTransform: "uppercase",
											}}
										>
											{segment.label}
										</div>
									))}
								</div>

								<div
									style={{
										marginTop: px(12, scale),
										borderRadius: px(15, scale),
										overflow: "hidden",
										background: "#0F766E",
										boxShadow: `0 ${px(14, scale)}px ${px(32, scale)}px rgba(15,118,110,0.2)`,
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: px(8, scale),
											padding: `${px(8, scale)}px ${px(10, scale)}`,
											color: "white",
											fontSize: px(10, scale),
											fontWeight: 800,
										}}
										className="pt-2 px-2"
									>
										<div
											style={{
												width: px(10, scale),
												height: px(10, scale),
												borderRadius: 999,
												background: "#34D399",
											}}
										/>
										O NÚMERO DO SEU NEGÓCIO
									</div>
									<div
										style={{
											margin: px(10, scale),
											padding: `${px(12, scale)}px ${px(13, scale)}`,
											borderRadius: px(13, scale),
											background: "#DCF3C6",
											color: "#355524",
											fontSize: px(11.5, scale),
											lineHeight: 1.45,
											boxShadow: `0 ${px(10, scale)}px ${px(24, scale)}px rgba(0,0,0,0.08)`,
										}}
										className="p-2"
									>
										Olá <strong>{"{{NOME DO CLIENTE}}"}</strong>, você é muito especial pra nós e adoraríamos sua presença amanhã. Reservamos{" "}
										<strong>R$ 15,00</strong> pra que você use nas suas compras. Esperamos você aqui! 💛
										<div
											style={{
												marginTop: px(8, scale),
												textAlign: "right",
												fontSize: px(8.5, scale),
												fontWeight: 700,
												color: "rgba(53,85,36,0.55)",
											}}
										>
											18:00
										</div>
									</div>
								</div>
							</div>
						</WorkflowCard>

						<Connector scale={scale} from="#EF4444" to="#FBBF24" />

						<WorkflowCard
							scale={scale}
							number="02"
							title="SISTEMA DISPARA"
							subtitle="1 dia antes, no automático"
							accent={{
								ring: "#FBBF24",
								bg: "rgba(251,191,36,0.18)",
								text: "#92400E",
								glow: "rgba(251,191,36,0.34)",
							}}
						>
							<div className="flex flex-col gap-0.5">
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										color: "rgba(23,32,51,0.68)",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: px(8, scale),
											fontSize: px(10, scale),
											fontWeight: 900,
											letterSpacing: "0.06em",
											textTransform: "uppercase",
											color: "#F59E0B",
										}}
									>
										<div
											style={{
												width: px(10, scale),
												height: px(10, scale),
												borderRadius: 999,
												background: "#FCD34D",
												boxShadow: `0 0 ${px(12, scale)}px rgba(251,191,36,0.45)`,
											}}
										/>
										Em execução
									</div>
									<span style={{ fontSize: px(10, scale), fontWeight: 800 }}>TERÇA, 18:00</span>
								</div>

								<div style={{ display: "flex", alignItems: "baseline", gap: px(6, scale) }}>
									<span style={{ fontSize: px(36, scale), fontWeight: 900, color: "#0F172A", letterSpacing: "-0.05em" }}>134</span>
									<span style={{ fontSize: px(14, scale), fontWeight: 800, color: "rgba(23,32,51,0.55)" }}>/ 200 clientes</span>
								</div>

								<div
									style={{
										height: px(10, scale),
										borderRadius: 999,
										background: "rgba(148,163,184,0.18)",
										overflow: "hidden",
									}}
								>
									<div
										style={{
											width: "67%",
											height: "100%",
											borderRadius: 999,
											background: "linear-gradient(90deg, #34D399 0%, #10B981 100%)",
											boxShadow: `0 0 ${px(18, scale)}px rgba(16,185,129,0.28)`,
										}}
									/>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: px(10, scale),
									}}
								>
									<span
										style={{
											fontSize: px(10, scale),
											fontWeight: 900,
											letterSpacing: "0.06em",
											textTransform: "uppercase",
											color: "#34D399",
										}}
									>
										Enviando para 200 clientes
									</span>
									<div
										style={{
											padding: `${px(5, scale)}px ${px(10, scale)}px`,
											borderRadius: 999,
											border: "1px solid rgba(16,185,129,0.22)",
											background: "rgba(16,185,129,0.08)",
											color: "#10B981",
											fontSize: px(10, scale),
											fontWeight: 900,
										}}
										className="flex items-center gap-1.5"
									>
										<WhatsappIcon className="h-4 w-4" /> WhatsApp
									</div>
								</div>
							</div>
						</WorkflowCard>

						<Connector scale={scale} from="#FBBF24" to="#10B981" />

						<WorkflowCard
							scale={scale}
							number="03"
							title="RECEITA SOBE"
							subtitle="Pior dia vira o melhor"
							accent={{
								ring: "#10B981",
								bg: "rgba(16,185,129,0.14)",
								text: "#047857",
								glow: "rgba(16,185,129,0.28)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "stretch",
									gap: px(14, scale),
									padding: px(12, scale),
									borderRadius: px(16, scale),
									border: "1px solid rgba(52,211,153,0.28)",
									background: "linear-gradient(180deg, rgba(236,253,245,0.9) 0%, rgba(255,255,255,0.96) 100%)",
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: px(9, scale),
											fontWeight: 900,
											letterSpacing: "0.08em",
											textTransform: "uppercase",
											color: "rgba(15,118,110,0.52)",
										}}
									>
										Receita na quarta
									</div>
									<div
										style={{
											marginTop: px(8, scale),
											fontSize: px(13, scale),
											fontWeight: 800,
											color: "rgba(148,163,184,0.95)",
											textDecoration: "line-through",
										}}
									>
										R$ 1.240
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: px(10, scale), marginTop: px(2, scale) }}>
										<span style={{ fontSize: px(30, scale), fontWeight: 900, color: "#10B981", letterSpacing: "-0.06em" }}>R$1.860</span>
										<div
											style={{
												padding: `${px(5, scale)}px ${px(8, scale)}px`,
												borderRadius: px(10, scale),
												background: "rgba(16,185,129,0.14)",
												border: "1px solid rgba(16,185,129,0.2)",
												color: "#10B981",
												fontSize: px(10, scale),
												fontWeight: 900,
											}}
										>
											+150%
										</div>
									</div>
								</div>

								<div
									style={{
										width: px(154, scale),
										borderRadius: px(12, scale),
										border: "1px solid rgba(148,163,184,0.18)",
										background: "linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(241,245,249,0.95) 100%)",
										padding: `${px(10, scale)}px ${px(8, scale)}`,
										display: "grid",
										placeItems: "center",
									}}
								>
									<TrendChart scale={scale} />
								</div>
							</div>
						</WorkflowCard>
					</div>
				</div>
				<div className="flex align-center justify-between gap-4 p-4 border-t border-white/12 z-30">
					<img
						src={LogoWhite.src}
						alt="RecompraCRM"
						style={{
							height: logoHeight,
							width: "auto",
							objectFit: "contain",
							display: "block",
						}}
						crossOrigin="anonymous"
					/>

					<div style={{ display: "flex", alignItems: "center", gap: px(12, scale) }}>
						<span
							style={{
								fontSize: px(16, scale),
								fontWeight: 500,
								color: "rgba(248,250,252,0.55)",
							}}
						>
							Conheça e
						</span>
						<div
							style={{
								padding: `${px(10, scale)}px ${px(22, scale)}px`,
								borderRadius: px(10, scale),
								background: "linear-gradient(180deg, #FFCD2E 0%, #FFB800 100%)",
								color: "#0A0F18",
								fontSize: px(16, scale),
								fontWeight: 900,
								boxShadow: `0 ${px(10, scale)}px ${px(28, scale)}px rgba(255,184,0,0.32)`,
							}}
						>
							Comece grátis
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
