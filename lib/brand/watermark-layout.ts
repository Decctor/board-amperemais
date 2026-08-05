/**
 * Geometria do lockup de "dois orbes" (logo da organização + símbolo Recompra).
 *
 * Puro de propósito: o watermark do admin renderiza no cliente via `html-to-image`
 * e o cabeçalho do convite renderiza no servidor via satori. Os dois precisam da
 * mesma matemática — se ela viver em só um dos lados, eles divergem.
 */
export const RECOMPRA_BRAND_BLUE = "#24549C";
export const RECOMPRA_BRAND_YELLOW = "#FFB900";

export type TWatermarkLayout = {
	width: number;
	height: number;
	padding: number;
	overlap: number;
	border: number;
	shadowBlur: number;
	shadowOffset: number;
};

export function getWatermarkLayout(diameter: number, outerPaddingPercent = 10): TWatermarkLayout {
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
