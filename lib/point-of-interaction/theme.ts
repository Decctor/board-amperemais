import { DEFAULT_ORG_COLORS, ensureReadableForeground } from "@/lib/organizations/colors";
import type { CSSProperties } from "react";

/**
 * Tema do ponto de interação DERIVADO da identidade que a organização já configura
 * (`corPrimaria`, `corPrimariaForeground`, `corSecundaria`, `corSecundariaForeground`).
 * Nenhuma coluna nova, nenhuma tela de configuração nova: a paleta estendida — o tom profundo do
 * gradiente e a lavagem clara de fundo — sai por `color-mix()`, que aceita qualquer cor CSS que a
 * organização tenha digitado e não exige biblioteca de manipulação de cor.
 *
 * Convive com `OrgColorsProvider`: aquele continua dono de `--color-brand*` (usado por `bg-brand`),
 * este acrescenta `--poi-*` para os pontos onde o POI quer profundidade de marca.
 */

// Quanto da primária sobrevive na mistura com preto — 28% de preto é o suficiente para dar volume
// ao gradiente sem virar outra cor.
const PRIMARY_DEEP_PRIMARY_RATIO = 72;
// Lavagem de fundo: ~92% branco, o bastante para tingir a tela sem competir com o conteúdo.
const TINT_PRIMARY_RATIO = 8;

export type TPoiTheme = {
	primary: string;
	primaryForeground: string;
	primaryDeep: string;
	accent: string;
	accentForeground: string;
	tint: string;
};

type DerivePoiThemeInput = {
	corPrimaria?: string | null;
	corPrimariaForeground?: string | null;
	corSecundaria?: string | null;
	corSecundariaForeground?: string | null;
};

export function derivePoiTheme({ corPrimaria, corPrimariaForeground, corSecundaria, corSecundariaForeground }: DerivePoiThemeInput): TPoiTheme {
	const primary = corPrimaria?.trim() || DEFAULT_ORG_COLORS.primary;
	const accent = corSecundaria?.trim() || DEFAULT_ORG_COLORS.secondary;

	return {
		primary,
		primaryForeground: ensureReadableForeground(primary, corPrimariaForeground?.trim() || DEFAULT_ORG_COLORS.primaryForeground),
		primaryDeep: `color-mix(in oklab, ${primary} ${PRIMARY_DEEP_PRIMARY_RATIO}%, #000000)`,
		accent,
		accentForeground: ensureReadableForeground(accent, corSecundariaForeground?.trim() || DEFAULT_ORG_COLORS.secondaryForeground),
		tint: `color-mix(in oklab, ${primary} ${TINT_PRIMARY_RATIO}%, #ffffff)`,
	};
}

/**
 * Variáveis CSS do tema, prontas para um wrapper inline em server component
 * (SSR-safe, sem flash de primeira pintura, sem vazar para o resto do documento).
 */
export function getPoiThemeStyle(theme: TPoiTheme): CSSProperties {
	return {
		"--poi-primary": theme.primary,
		"--poi-primary-foreground": theme.primaryForeground,
		"--poi-primary-deep": theme.primaryDeep,
		"--poi-accent": theme.accent,
		"--poi-accent-foreground": theme.accentForeground,
		"--poi-tint": theme.tint,
	} as CSSProperties;
}

/**
 * Gradiente de profundidade da marca. A versão com `var()` só funciona dentro do wrapper do tema;
 * fora dele (ex.: pôster impresso montado no dashboard) use `getPoiPrimaryGradient(theme)`.
 */
export const POI_PRIMARY_GRADIENT = "linear-gradient(145deg, var(--poi-primary) 0%, var(--poi-primary-deep) 100%)";
export const POI_ACCENT_GRADIENT = "linear-gradient(145deg, var(--poi-accent) 0%, var(--poi-primary) 100%)";

export function getPoiPrimaryGradient(theme: TPoiTheme): string {
	return `linear-gradient(145deg, ${theme.primary} 0%, ${theme.primaryDeep} 100%)`;
}

export function getPoiAccentGradient(theme: TPoiTheme): string {
	return `linear-gradient(145deg, ${theme.accent} 0%, ${theme.primary} 100%)`;
}
