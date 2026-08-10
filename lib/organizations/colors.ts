/**
 * Primitivas puras de cor da identidade da organização.
 *
 * Vivem fora de `OrgColorsProvider` (que é "use client") porque server components — como as páginas
 * do ponto de interação — precisam derivar cores durante o render no servidor. Todo export de um
 * módulo "use client" vira client reference e não pode ser chamado no servidor.
 */

// Cores padrão aplicadas quando a organização não configurou a própria identidade.
// Espelham os tokens `--color-brand*` de styles/globals.css.
export const DEFAULT_ORG_COLORS = {
	primary: "#24549C", // Blue - Structural actions, active states, focus and navigation
	primaryForeground: "#FFFFFF", // White text on blue
	secondary: "#FFB900", // Yellow/Gold - Cashback, rewards and celebration moments
	secondaryForeground: "#000000", // Black text on yellow
} as const;

// WCAG relative luminance of a hex color (0 = black, 1 = white)
function getRelativeLuminance(hex: string): number {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return 0;
	const [r, g, b] = [result[1], result[2], result[3]].map((channel) => {
		const value = Number.parseInt(channel, 16) / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hexA: string, hexB: string): number {
	const luminanceA = getRelativeLuminance(hexA);
	const luminanceB = getRelativeLuminance(hexB);
	const lighter = Math.max(luminanceA, luminanceB);
	const darker = Math.min(luminanceA, luminanceB);
	return (lighter + 0.05) / (darker + 0.05);
}

// Org colors come straight from the database with no guarantee the configured
// foreground is readable on the background. Below 3:1 (WCAG minimum for UI
// components / large text) we fall back to plain black or white.
export function ensureReadableForeground(background: string, foreground: string): string {
	if (getContrastRatio(background, foreground) >= 3) return foreground;
	return getContrastRatio(background, "#111111") >= getContrastRatio(background, "#ffffff") ? "#111111" : "#ffffff";
}
