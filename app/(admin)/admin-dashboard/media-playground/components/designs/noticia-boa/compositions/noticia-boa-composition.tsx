"use client";

import { NOTICIA_BOA_IMAGE_COLUMN_WIDTH_RATIO } from "../constants";
import { getNoticiaBoaScale } from "../scale";
import { NoticiaBoaAtmosphere } from "./noticia-boa-atmosphere";
import { NoticiaBoaCanvas } from "./noticia-boa-canvas";
import { NoticiaBoaFooter } from "./noticia-boa-footer";
import { NoticiaBoaHeroFeedReels } from "./noticia-boa-hero-feed-reels";
import { NoticiaBoaHeroSquare } from "./noticia-boa-hero-square";

type NoticiaBoaVariant = "feed" | "reels" | "square";

type NoticiaBoaCompositionProps = {
	width: number;
	height: number;
	variant: NoticiaBoaVariant;
	className?: string;
};

function headlineSizeForVariant(variant: NoticiaBoaVariant, t: number): number {
	if (variant === "reels") return Math.round(52 * Math.min(1.12, 0.92 + t * 0.1));
	if (variant === "feed") return Math.round(48 * Math.min(1.12, 0.92 + t * 0.1));
	return Math.round(76 * Math.min(1, t + 3));
}

function bodySizeForVariant(variant: NoticiaBoaVariant, t: number): number {
	if (variant === "reels") return Math.round(26 * Math.min(1.08, 0.95 + t * 0.06));
	if (variant === "feed") return Math.round(24 * Math.min(1.08, 0.95 + t * 0.06));
	return Math.round(26 * Math.min(1, t + 0.06));
}

function kickerSizeForVariant(variant: NoticiaBoaVariant, t: number): number {
	const base = variant === "square" ? 11 : 14;
	return Math.round(base * Math.min(1.05, 0.95 + t * 0.05));
}

/** Tamanho do texto de detalhe (feed/reels, coluna esquerda) */
function detailSizeForVariant(variant: "feed" | "reels", t: number): number {
	const base = variant === "reels" ? 22 : 20;
	return Math.round(base * Math.min(1.06, 0.94 + t * 0.05));
}

/** Headline no layout em duas colunas (feed/reels) — ligeiramente menor que o quadrado para caber mais copy */
function splitHeadlineSizeForVariant(variant: "feed" | "reels", t: number): number {
	const base = variant === "reels" ? 52 : 48;
	return Math.round(base * Math.min(1.12, 0.9 + t * 0.1));
}

export function NoticiaBoaComposition({ width, height, variant, className }: NoticiaBoaCompositionProps) {
	const tokens = getNoticiaBoaScale(height);
	const { t, padX } = tokens;

	const padY =
		variant === "square" ? Math.max(40, Math.round(26 * t)) : Math.max(36, Math.round(28 * t));

	const logoHeightPx = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(30 * Math.min(1, t));
	const footerBandApprox = Math.round(14 * t) + 2 + Math.max(logoHeightPx, Math.round(44 * t));
	const padBottom = padY + footerBottomPx + footerBandApprox;

	const heroBasis = Math.round(396 * Math.min(1.08, 0.88 + t * 0.12));
	const imageColumnWidth = Math.round(heroBasis * NOTICIA_BOA_IMAGE_COLUMN_WIDTH_RATIO);

	const bodyPx = bodySizeForVariant(variant, t);
	const kickerPx = kickerSizeForVariant(variant, t);

	if (variant === "square") {
		const headlinePx = headlineSizeForVariant(variant, t);
		return (
			<NoticiaBoaCanvas width={width} height={height} className={className}>
				<NoticiaBoaAtmosphere />
				<div
					data-design-role="noticia-boa-frame"
					className="noticia-boa__frame"
					style={{
						position: "relative",
						zIndex: 1,
						boxSizing: "border-box",
						width: "100%",
						height: "100%",
						padding: `${padY}px ${padX}px ${padBottom}px ${padX}px`,
						display: "flex",
						flexDirection: "column",
						minHeight: 0,
					}}
				>
					<div
						style={{
							flex: 1,
							minHeight: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "stretch",
							justifyContent: "center",
						}}
					>
						<NoticiaBoaHeroSquare
							width={width}
							tokens={tokens}
							imageColumnWidth={imageColumnWidth}
							headlineSize={headlinePx}
							bodySize={bodyPx}
							kickerSize={kickerPx}
						/>
					</div>
				</div>
				<NoticiaBoaFooter
					tokens={tokens}
					padX={padX}
					logoHeightPx={logoHeightPx}
					footerBottomPx={footerBottomPx}
					className="noticia-boa__footer"
				/>
			</NoticiaBoaCanvas>
		);
	}

	const splitHeadlinePx = splitHeadlineSizeForVariant(variant, t);
	const detailPx = detailSizeForVariant(variant, t);

	return (
		<NoticiaBoaCanvas width={width} height={height} className={className}>
			<NoticiaBoaAtmosphere />
			<div
				data-design-role="noticia-boa-frame"
				className="noticia-boa__frame"
				style={{
					position: "relative",
					zIndex: 1,
					boxSizing: "border-box",
					width: "100%",
					height: "100%",
					padding: `${padY}px ${padX}px ${padBottom}px ${padX}px`,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}
			>
				<div
					style={{
						flex: 1,
						minHeight: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						justifyContent: "center",
					}}
				>
					<NoticiaBoaHeroFeedReels
						width={width}
						tokens={tokens}
						imageColumnWidth={imageColumnWidth}
						headlineSize={splitHeadlinePx}
						bodySize={bodyPx}
						kickerSize={kickerPx}
						detailSize={detailPx}
						variant={variant}
					/>
				</div>
			</div>
			<NoticiaBoaFooter
				tokens={tokens}
				padX={padX}
				logoHeightPx={logoHeightPx}
				footerBottomPx={footerBottomPx}
				className="noticia-boa__footer"
			/>
		</NoticiaBoaCanvas>
	);
}
