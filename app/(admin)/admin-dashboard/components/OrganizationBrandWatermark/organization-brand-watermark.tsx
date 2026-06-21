import RecompraIconColorful from "@/utils/svgs/logos/RECOMPRA - ICON - COLORFUL.svg";

/** Recompra brand blue (Figma azul-primario) — fills the Recompra badge. */
const RECOMPRA_BLUE = "#24549C";
const FONT_STACK = "var(--font-raleway), ui-sans-serif, system-ui, sans-serif";

type OrganizationBrandWatermarkProps = {
	organizationName: string;
	/** Pre-resolved data URL (or remote URL) for the organization logo. `null` falls back to the initial. */
	organizationLogoSrc: string | null;
	/** Diameter of each badge in CSS px. The canvas sizes itself around the two overlapping badges. */
	diameter: number;
};

/**
 * Transparent "collab" watermark: the organization's logo badge overlapping the
 * Recompra icon badge. Meant to be overlaid on other media, so the canvas is
 * cropped tightly around the two circles and the background stays transparent.
 *
 * Layout math is exposed via {@link getWatermarkCanvasSize} so the export can
 * rasterize at the exact pixel dimensions.
 */
export default function OrganizationBrandWatermark({ organizationName, organizationLogoSrc, diameter }: OrganizationBrandWatermarkProps) {
	const { width, height, padding, overlap, border, shadowBlur, shadowOffset } = getWatermarkLayout(diameter);
	const initial = organizationName.trim().charAt(0).toUpperCase() || "?";

	const circleBaseStyle: React.CSSProperties = {
		width: diameter,
		height: diameter,
		borderRadius: "50%",
		border: `${border}px solid #FFFFFF`,
		boxShadow: `0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.18)`,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		boxSizing: "border-box",
		position: "relative",
	};

	return (
		<div style={{ position: "relative", width, height, background: "transparent", fontFamily: FONT_STACK }}>
			<div style={{ position: "absolute", top: padding, left: padding, display: "flex", alignItems: "center" }}>
				{/* Organization badge — sits in front of the Recompra badge. */}
				<div style={{ ...circleBaseStyle, background: "#FFFFFF", zIndex: 2 }}>
					{organizationLogoSrc ? (
						<img
							src={organizationLogoSrc}
							alt={organizationName}
							crossOrigin="anonymous"
							style={{ width: "74%", height: "74%", objectFit: "contain", display: "block" }}
						/>
					) : (
						<span style={{ fontSize: Math.round(diameter * 0.42), fontWeight: 800, color: RECOMPRA_BLUE, letterSpacing: "-0.04em" }}>{initial}</span>
					)}
				</div>

				{/* Recompra badge — blue fill keeps the colorful icon's white bars legible. */}
				<div style={{ ...circleBaseStyle, background: RECOMPRA_BLUE, zIndex: 1, marginLeft: -overlap }}>
					<img
						src={RecompraIconColorful.src}
						alt="Recompra"
						crossOrigin="anonymous"
						style={{ width: "86%", height: "86%", objectFit: "contain", display: "block" }}
					/>
				</div>
			</div>
		</div>
	);
}

type WatermarkLayout = {
	width: number;
	height: number;
	padding: number;
	overlap: number;
	border: number;
	shadowBlur: number;
	shadowOffset: number;
};

/** Derives every watermark dimension from the badge diameter. */
export function getWatermarkLayout(diameter: number): WatermarkLayout {
	const padding = Math.round(diameter * 0.1);
	const overlap = Math.round(diameter * 0.16);
	const border = Math.max(2, Math.round(diameter * 0.012));
	const shadowBlur = Math.round(diameter * 0.05);
	const shadowOffset = Math.round(diameter * 0.016);
	return {
		width: diameter * 2 - overlap + padding * 2,
		height: diameter + padding * 2,
		padding,
		overlap,
		border,
		shadowBlur,
		shadowOffset,
	};
}

/** Canvas size (CSS px) for a given badge diameter — used to size the export. */
export function getWatermarkCanvasSize(diameter: number) {
	const { width, height } = getWatermarkLayout(diameter);
	return { width, height };
}
