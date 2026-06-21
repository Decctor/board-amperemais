import RecompraIcon from "@/utils/images/logos/RECOMPRA - ICON - COLORFUL.png";
import RecompraLogoWhite from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- WHITE.svg";

/** Brand canvas — Figma: 0% #24549C → 100% #0C1D36 (vertical = top → bottom) */
const BG_GRADIENT = "linear-gradient(180deg, #24549C 0%, #0C1D36 100%)";
const FONT_STACK = "var(--font-raleway), ui-sans-serif, system-ui, sans-serif";
const GOLD = "#FFB800";

type OrganizationBrandStoryProps = {
	/** CSS px width of the canvas (1080 for all social presets). */
	width: number;
	/** CSS px height of the canvas. */
	height: number;
	organizationName: string;
	/** Pre-resolved data URL (or remote URL) for the organization logo. `null` falls back to the initial. */
	organizationLogoSrc: string | null;
};

/**
 * Self-contained marketing canvas pairing the Recompra icon with a specific
 * organization's logo as overlapping "collab" badges. Adapts to feed / story /
 * square presets by scaling every dimension from the 1080px base width (`t`).
 */
export default function OrganizationBrandStory({ width, height, organizationName, organizationLogoSrc }: OrganizationBrandStoryProps) {
	// Scale token — every size is derived from the 1080px design base.
	const t = width / 1080;

	const circleSize = Math.round(300 * t);
	// Overlap the two badges so they read as a single "collaboration" mark.
	const overlap = Math.round(circleSize * 0.18);

	const initial = organizationName.trim().charAt(0).toUpperCase() || "?";

	return (
		<div
			style={{
				position: "relative",
				width,
				height,
				overflow: "hidden",
				background: BG_GRADIENT,
				fontFamily: FONT_STACK,
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				alignItems: "center",
				paddingTop: Math.round(96 * t),
				paddingBottom: Math.round(96 * t),
				paddingLeft: Math.round(72 * t),
				paddingRight: Math.round(72 * t),
				boxSizing: "border-box",
			}}
		>
			{/* ─── Atmosphere ──────────────────────────────────── */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(${Math.round(900 * t)}px ${Math.round(900 * t)}px at 50% 32%, rgba(255,184,0,0.16) 0%, rgba(255,184,0,0) 60%)`,
					pointerEvents: "none",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(${Math.round(700 * t)}px ${Math.round(700 * t)}px at 85% 95%, rgba(36,84,156,0.55) 0%, rgba(36,84,156,0) 70%)`,
					pointerEvents: "none",
				}}
			/>

			{/* ─── Header: Recompra brand ──────────────────────── */}
			<div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(14 * t) }}>
				<img
					src={RecompraLogoWhite.src}
					alt="RecompraCRM"
					crossOrigin="anonymous"
					style={{ height: Math.round(58 * t), width: "auto", objectFit: "contain", display: "block" }}
				/>
			</div>

			{/* ─── Center: collab badges + name ────────────────── */}
			<div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(48 * t) }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
					{/* Organization logo badge */}
					<div
						style={{
							width: circleSize,
							height: circleSize,
							borderRadius: "50%",
							background: "#FFFFFF",
							border: `${Math.round(6 * t)}px solid rgba(255,255,255,0.9)`,
							boxShadow: `0 ${Math.round(28 * t)}px ${Math.round(60 * t)}px rgba(0,0,0,0.35)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							overflow: "hidden",
							position: "relative",
							zIndex: 2,
						}}
					>
						{organizationLogoSrc ? (
							<img
								src={organizationLogoSrc}
								alt={organizationName}
								crossOrigin="anonymous"
								style={{ width: "78%", height: "78%", objectFit: "contain", display: "block" }}
							/>
						) : (
							<span style={{ fontSize: Math.round(140 * t), fontWeight: 800, color: "#24549C", letterSpacing: "-0.04em" }}>{initial}</span>
						)}
					</div>

					{/* Recompra icon badge — overlaps the organization badge */}
					<div
						style={{
							width: circleSize,
							height: circleSize,
							borderRadius: "50%",
							background: "#FFFFFF",
							border: `${Math.round(6 * t)}px solid rgba(255,255,255,0.9)`,
							boxShadow: `0 ${Math.round(28 * t)}px ${Math.round(60 * t)}px rgba(0,0,0,0.35)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							overflow: "hidden",
							position: "relative",
							zIndex: 1,
							marginLeft: -overlap,
						}}
					>
						<img
							src={RecompraIcon.src}
							alt="Recompra"
							crossOrigin="anonymous"
							style={{ width: "70%", height: "70%", objectFit: "contain", display: "block" }}
						/>
					</div>
				</div>

				{/* Organization name */}
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(16 * t), textAlign: "center" }}>
					<h1
						style={{
							margin: 0,
							fontSize: Math.round(76 * t),
							lineHeight: 1.05,
							fontWeight: 800,
							color: "#FAFAFA",
							letterSpacing: "-0.03em",
							maxWidth: Math.round(820 * t),
						}}
					>
						{organizationName}
					</h1>
					<div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * t) }}>
						<span style={{ fontSize: Math.round(30 * t), fontWeight: 500, color: "rgba(248,250,252,0.7)" }}>agora com</span>
						<span style={{ fontSize: Math.round(30 * t), fontWeight: 800, color: GOLD, letterSpacing: "-0.01em" }}>RecompraCRM</span>
					</div>
				</div>
			</div>

			{/* ─── Footer: tagline + CTA ───────────────────────── */}
			<div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(28 * t) }}>
				<p
					style={{
						margin: 0,
						fontSize: Math.round(28 * t),
						lineHeight: 1.4,
						fontWeight: 500,
						color: "rgba(248,250,252,0.6)",
						textAlign: "center",
						maxWidth: Math.round(760 * t),
					}}
				>
					Dados que viram relacionamento — e relacionamento que vira receita.
				</p>
				<div
					style={{
						background: "linear-gradient(180deg, #FFCD2E 0%, #FFB800 100%)",
						color: "#0A0F18",
						fontWeight: 800,
						fontSize: Math.round(30 * t),
						padding: `${Math.round(20 * t)}px ${Math.round(52 * t)}px`,
						borderRadius: Math.round(16 * t),
						letterSpacing: "-0.02em",
						whiteSpace: "nowrap",
						boxShadow: `0 ${Math.round(16 * t)}px ${Math.round(40 * t)}px rgba(255,184,0,0.32), inset 0 1px 0 rgba(255,255,255,0.45)`,
					}}
				>
					Comece grátis
				</div>
			</div>
		</div>
	);
}
