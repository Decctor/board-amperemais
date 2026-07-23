import React from "react";
import { loadBrandLogo, type TBrandLogoKey } from "../assets";
import { BRAND_COLORS } from "../tokens";
import type { TBrandTemplate } from "./types";

const WIDTH = 1920;
const HEIGHT = 1080;
const SAFE_MARGIN = 96;

// Geometria das 5 barras do ícone (extraída de icon-color-on-dark.svg,
// normalizada pela barra mais alta) para desenhar a marca d'água em qualquer cor.
const ICON_BAR_HEIGHTS = [0.4286, 1, 0.5714, 1, 0.4286] as const;
const ICON_BAR_WIDTH_RATIO = 0.2857;
const ICON_BAR_GAP_RATIO = 0.0571;

function IconBarsWatermark({ height, colors }: { height: number; colors: readonly string[] }) {
	const barWidth = height * ICON_BAR_WIDTH_RATIO;
	const gap = height * ICON_BAR_GAP_RATIO;

	return (
		<div style={{ display: "flex", alignItems: "center", gap }}>
			{ICON_BAR_HEIGHTS.map((ratio, index) => (
				<div
					key={index}
					style={{
						width: barWidth,
						height: height * ratio,
						borderRadius: barWidth / 2,
						backgroundColor: colors[index % colors.length],
					}}
				/>
			))}
		</div>
	);
}

type TMeetingBackgroundVariantConfig = {
	backgroundImage: string;
	glow: string | null;
	logoKey: TBrandLogoKey;
	watermarkColor: string;
	watermarkOpacity: number;
	accentGradient: string | null;
};

const VARIANTS: Record<string, TMeetingBackgroundVariantConfig> = {
	dark: {
		backgroundImage: "linear-gradient(135deg, #1c3f73 0%, #102849 55%, #081328 100%)",
		glow: "radial-gradient(circle at 78% 22%, rgba(36, 84, 156, 0.45) 0%, rgba(36, 84, 156, 0) 60%)",
		logoKey: "horizontalColorOnDark",
		watermarkColor: BRAND_COLORS.white,
		watermarkOpacity: 0.05,
		accentGradient: `linear-gradient(90deg, ${BRAND_COLORS.red} 0%, ${BRAND_COLORS.amber} 100%)`,
	},
	light: {
		backgroundImage: "linear-gradient(135deg, #ffffff 0%, #f4f5f7 60%, #e9ecf1 100%)",
		glow: "radial-gradient(circle at 78% 22%, rgba(36, 84, 156, 0.08) 0%, rgba(36, 84, 156, 0) 60%)",
		logoKey: "horizontalBadgeColorOnLight",
		watermarkColor: BRAND_COLORS.blue,
		watermarkOpacity: 0.06,
		accentGradient: `linear-gradient(90deg, ${BRAND_COLORS.red} 0%, ${BRAND_COLORS.amber} 100%)`,
	},
	amber: {
		backgroundImage: "linear-gradient(135deg, #ffc41f 0%, #ffb900 55%, #f0a800 100%)",
		glow: null,
		logoKey: "horizontalBlack",
		watermarkColor: BRAND_COLORS.black,
		watermarkOpacity: 0.06,
		accentGradient: `linear-gradient(90deg, ${BRAND_COLORS.black} 0%, ${BRAND_COLORS.black} 100%)`,
	},
};

async function renderMeetingBackground(variant: string) {
	const config = VARIANTS[variant];
	if (!config) throw new Error(`Variante desconhecida para meeting-background: ${variant}`);

	const logo = await loadBrandLogo(config.logoKey);
	const logoWidth = 380;
	const logoHeight = Math.round(logoWidth * (logo.height / logo.width));

	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: WIDTH,
				height: HEIGHT,
				backgroundImage: config.backgroundImage,
				overflow: "hidden",
			}}
		>
			{config.glow ? (
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 0,
						left: 0,
						width: WIDTH,
						height: HEIGHT,
						backgroundImage: config.glow,
					}}
				/>
			) : null}

			{/* Marca d'água: ícone gigante sangrando pela borda direita */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					right: -160,
					top: 0,
					height: HEIGHT,
					alignItems: "center",
					opacity: config.watermarkOpacity,
				}}
			>
				<IconBarsWatermark height={680} colors={[config.watermarkColor]} />
			</div>

			{/* Logo no canto inferior esquerdo, fora da área ocupada pela pessoa */}
			<div style={{ display: "flex", position: "absolute", left: SAFE_MARGIN, bottom: SAFE_MARGIN }}>
				<img src={logo.dataUrl} width={logoWidth} height={logoHeight} alt="" />
			</div>

			{config.accentGradient ? (
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						bottom: 0,
						width: WIDTH,
						height: 8,
						backgroundImage: config.accentGradient,
					}}
				/>
			) : null}
		</div>
	);
}

export const meetingBackgroundTemplate: TBrandTemplate = {
	description: "Fundo para reuniões virtuais (1920x1080) com logo e marca d'água do ícone.",
	width: WIDTH,
	height: HEIGHT,
	variants: Object.keys(VARIANTS),
	render: renderMeetingBackground,
};
