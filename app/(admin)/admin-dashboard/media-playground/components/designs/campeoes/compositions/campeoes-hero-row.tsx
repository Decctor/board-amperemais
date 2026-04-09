import { cn } from "@/lib/utils";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesHeroRowProps = {
	width: number;
	tokens: CampeoesLayoutTokens;
	heroBasis: number;
	headlineSize: number;
	bodySize: number;
	className?: string;
	/** Centraliza texto + card no eixo cruzado (ex.: post quadrado só com herói) */
	heroLayout?: "default" | "fill";
};

export function CampeoesHeroRow({
	width,
	tokens,
	heroBasis,
	headlineSize,
	bodySize,
	className,
	heroLayout = "default",
}: CampeoesHeroRowProps) {
	const { t, padX, radiusLg } = tokens;
	const isFill = heroLayout === "fill";
	const rowGap = Math.round((isFill ? 26 : 20) * t);
	/** No post quadrado (fill), aumenta card e tipos internos para preencher o canvas */
	const cf = isFill ? 1.22 : 1;

	return (
		<div
			data-design-role="campeoes-hero-row"
			className={cn(className)}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: isFill ? "center" : "flex-start",
				justifyContent: "space-between",
				gap: rowGap,
				paddingBottom: isFill ? 0 : Math.round(18 * t),
				boxSizing: "border-box",
				width: isFill ? "100%" : undefined,
			}}
		>
			<div style={{ flex: "1 1 0", minWidth: 0, maxWidth: width - padX * 2 - heroBasis - rowGap }}>
				<h1
					style={{
						fontSize: headlineSize,
						fontWeight: 800,
						color: "#FAFAFA",
						lineHeight: isFill ? 1.07 : 1.06,
						margin: 0,
						letterSpacing: "-0.032em",
						textShadow: "0 4px 28px rgba(0,0,0,0.35)",
					}}
				>
					Crie campanhas automáticas
					<br />
					de <span style={{ color: "#FFCD2E", fontWeight: 800 }}>WhatsApp</span> e aumente
					<br />
					sua{" "}
					<span
						style={{
							color: "#FFCD2E",
							textDecoration: "underline",
							textDecorationColor: "rgba(255, 205, 46, 0.55)",
							textUnderlineOffset: "0.12em",
							fontWeight: 800,
						}}
					>
						taxa de recompra
					</span>
				</h1>
				<p
					style={{
						margin: `${Math.round((isFill ? 22 : 18) * t)}px 0 0`,
						fontSize: bodySize,
						fontWeight: 500,
						color: "rgba(252,252,252,0.78)",
						lineHeight: isFill ? 1.52 : 1.55,
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
					borderRadius: Math.round(radiusLg * (isFill ? 1.08 : 1)),
					background: "linear-gradient(165deg, #FFFFFF 0%, #F4F7FB 100%)",
					boxShadow: "0 18px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.7), 0 0 80px rgba(0,0,0,0.12)",
					transform: "rotate(-0.9deg)",
				}}
			>
				<div
					style={{
						padding: `${Math.round(20 * t * cf)}px ${Math.round(22 * t * cf)}px`,
					}}
				>
					<div
						style={{
							fontSize: Math.round(9 * t * cf),
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: "#9CA3AF",
							marginBottom: Math.round(10 * t * cf),
						}}
					>
						Receita Atribuída
					</div>
					<div
						style={{
							fontSize: Math.round(34 * t * cf),
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
						borderRadius: `0 0 ${Math.round(radiusLg * (isFill ? 1.08 : 1))}px ${Math.round(radiusLg * (isFill ? 1.08 : 1))}px`,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							flex: 1,
							minWidth: 0,
							padding: `${Math.round(12 * t * cf)}px ${Math.round(14 * t * cf)}px`,
							borderRight: "1px solid rgba(203,213,225,0.55)",
						}}
					>
						<div
							style={{
								fontSize: Math.round(8 * t * cf),
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: "#64748B",
								marginBottom: Math.round(5 * t * cf),
							}}
						>
							Taxa de Conversão
						</div>
						<div
							style={{
								fontSize: Math.round(23 * t * cf),
								fontWeight: 800,
								color: "#059669",
								letterSpacing: "-0.02em",
							}}
						>
							75,39%
						</div>
					</div>
					<div
						style={{
							flex: 1,
							minWidth: 0,
							padding: `${Math.round(12 * t * cf)}px ${Math.round(14 * t * cf)}px`,
						}}
					>
						<div
							style={{
								fontSize: Math.round(8 * t * cf),
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: "#64748B",
								marginBottom: Math.round(5 * t * cf),
							}}
						>
							Conversões
						</div>
						<div
							style={{
								fontSize: Math.round(23 * t * cf),
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
	);
}
