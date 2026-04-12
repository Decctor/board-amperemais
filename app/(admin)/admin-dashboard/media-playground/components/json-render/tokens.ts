"use client";

export function getMediaRenderTokens(height: number) {
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

export type TMediaRenderTokens = ReturnType<typeof getMediaRenderTokens>;

/**
 * Valores em px já dimensionados (sem multiplicar de novo por `t` no registry),
 * para alinhar frames e herói ao cálculo manual de `campeoes-quadrado.tsx` / `campeoes-hero-row`.
 */
export type TMediaLayoutVariant = "feed" | "reels" | "square";

export function getMediaJsonInitialState(width: number, height: number, layoutVariant: TMediaLayoutVariant = "feed") {
	const t = (height * 1.2) / 1350;
	const padX = Math.max(40, Math.round(48 * t));
	const footerBottomBase = layoutVariant === "reels" ? 36 : 30;
	const footerBottomPx = Math.round(footerBottomBase * Math.min(1, t));

	const padYQuadrado = Math.max(40, Math.round(26 * t));
	const logoHeightPxQuadrado = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPxQuadradoFrame = Math.round(30 * Math.min(1, t));
	const footerBandApprox = Math.round(14 * t) + 2 + Math.max(logoHeightPxQuadrado, Math.round(44 * t));
	const padBottomQuadrado = padYQuadrado + footerBottomPxQuadradoFrame + footerBandApprox;

	const rowGapQuadrado = Math.round(26 * t);
	const heroBasisQuadrado = Math.round(396 * Math.min(1.08, 0.88 + t * 0.12));
	const heroCopyMaxWidthQuadrado = Math.max(0, width - padX * 2 - heroBasisQuadrado - rowGapQuadrado);
	const radiusLg = Math.round(20 * t);
	const heroCardBorderRadiusQuadrado = Math.round(radiusLg * 1.08);

	return {
		layout: {
			padXPx: `${padX}px`,
			footerBottomPx: `${footerBottomPx}px`,
			campeoesQuadrado: {
				framePaddingTop: `${padYQuadrado}px`,
				framePaddingBottom: `${padBottomQuadrado}px`,
				framePaddingX: `${padX}px`,
				heroCopyMaxWidth: `${heroCopyMaxWidthQuadrado}px`,
				heroGridTemplateColumns: `minmax(0,1fr) ${heroBasisQuadrado}px`,
				heroRowGapPx: `${rowGapQuadrado}px`,
				heroCardBorderRadiusPx: `${heroCardBorderRadiusQuadrado}px`,
			},
		},
	};
}
