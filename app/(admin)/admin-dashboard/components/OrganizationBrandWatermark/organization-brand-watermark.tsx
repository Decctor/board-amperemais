import type { CSSProperties } from "react";

import { brandLogoSource } from "@/components/Brand/BrandLogo";

export const RECOMPRA_BRAND_BLUE = "#24549C";
export const RECOMPRA_BRAND_YELLOW = "#FFB900";

const FONT_STACK = "var(--font-raleway), ui-sans-serif, system-ui, sans-serif";

type OrganizationBrandWatermarkProps = {
	organizationName: string;
	organizationLogoSrc: string | null;
	diameter: number;
	backgroundColor?: string | null;
	outerPaddingPercent?: number;
	organizationBadgeBackgroundColor?: string;
};

export default function OrganizationBrandWatermark({
	organizationName,
	organizationLogoSrc,
	diameter,
	backgroundColor = null,
	outerPaddingPercent = 10,
	organizationBadgeBackgroundColor = "#FFFFFF",
}: OrganizationBrandWatermarkProps) {
	const { width, height, padding, overlap, border, shadowBlur, shadowOffset } = getWatermarkLayout(diameter, outerPaddingPercent);
	const initial = organizationName.trim().charAt(0).toUpperCase() || "?";

	const circleBaseStyle: CSSProperties = {
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
		<div style={{ position: "relative", width, height, background: backgroundColor ?? "transparent", fontFamily: FONT_STACK }}>
			<div style={{ position: "absolute", top: padding, left: padding, display: "flex", alignItems: "center" }}>
				<div style={{ ...circleBaseStyle, background: organizationBadgeBackgroundColor, zIndex: 2 }}>
					{organizationLogoSrc ? (
						<img
							src={organizationLogoSrc}
							alt={organizationName}
							crossOrigin="anonymous"
							style={{ width: "74%", height: "74%", objectFit: "contain", display: "block" }}
						/>
					) : (
						<span style={{ fontSize: Math.round(diameter * 0.42), fontWeight: 800, color: RECOMPRA_BRAND_BLUE }}>{initial}</span>
					)}
				</div>

				<div style={{ ...circleBaseStyle, background: RECOMPRA_BRAND_BLUE, zIndex: 1, marginLeft: -overlap }}>
					<img
						src={brandLogoSource("icon", "color-on-dark").src}
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

export function getWatermarkLayout(diameter: number, outerPaddingPercent = 10): WatermarkLayout {
	const safeOuterPaddingPercent = Math.min(Math.max(outerPaddingPercent, 4), 160);
	const padding = Math.round(diameter * (safeOuterPaddingPercent / 100));
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

export function getWatermarkCanvasSize(diameter: number, outerPaddingPercent = 10) {
	const { width, height } = getWatermarkLayout(diameter, outerPaddingPercent);
	return { width, height };
}
