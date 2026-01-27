"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

// Default colors used throughout the application
export const DEFAULT_ORG_COLORS = {
	primary: "#fead41", // Yellow/Gold - Current period charts, progress bars, buttons
	secondary: "#15599a", // Blue - Previous period charts, alternative accents
} as const;

// Lighter variant for backgrounds (e.g., chart fills)
export function getColorWithOpacity(hex: string, opacity: number): string {
	return `${hex}${Math.round(opacity * 255)
		.toString(16)
		.padStart(2, "0")}`;
}

// Convert hex to rgba string
export function hexToRgba(hex: string, opacity: number): string {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return `rgba(0, 0, 0, ${opacity})`;

	const r = parseInt(result[1], 16);
	const g = parseInt(result[2], 16);
	const b = parseInt(result[3], 16);

	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Convert hex to HSL for CSS variable compatibility
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return { h: 0, s: 0, l: 0 };

	let r = parseInt(result[1], 16) / 255;
	let g = parseInt(result[2], 16) / 255;
	let b = parseInt(result[3], 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

// Tailwind gradient class based on primary color
export function getPrimaryGradientClass(primaryColor: string): string {
	// For the default yellow, use the existing gradient
	if (primaryColor === DEFAULT_ORG_COLORS.primary || primaryColor === "#ffb900") {
		return "bg-linear-to-r from-yellow-200 to-amber-400";
	}
	// For custom colors, we'll use inline styles instead
	return "";
}

export type OrgColors = {
	primary: string;
	secondary: string;
};

type OrgColorsContextValue = {
	colors: OrgColors;
	// Convenience methods
	getPrimaryGradientStyle: () => React.CSSProperties;
	getChartColors: () => {
		current: string;
		previous: string;
		goal: string;
	};
};

const OrgColorsContext = createContext<OrgColorsContextValue | null>(null);

type OrgColorsProviderProps = {
	children: ReactNode;
	corPrimaria?: string | null;
	corSecundaria?: string | null;
};

export function OrgColorsProvider({ children, corPrimaria, corSecundaria }: OrgColorsProviderProps) {
	const colors: OrgColors = useMemo(
		() => ({
			primary: corPrimaria || DEFAULT_ORG_COLORS.primary,
			secondary: corSecundaria || DEFAULT_ORG_COLORS.secondary,
		}),
		[corPrimaria, corSecundaria]
	);

	// Set CSS variables for the organization colors
	useEffect(() => {
		const root = document.documentElement;

		// Set the org colors as CSS variables
		root.style.setProperty("--org-primary", colors.primary);
		root.style.setProperty("--org-secondary", colors.secondary);

		// Override --color-brand for POI and other pages using bg-brand class
		root.style.setProperty("--color-brand", colors.primary);

		// Also set HSL versions for more flexible styling
		const primaryHsl = hexToHsl(colors.primary);
		const secondaryHsl = hexToHsl(colors.secondary);

		root.style.setProperty("--org-primary-h", String(primaryHsl.h));
		root.style.setProperty("--org-primary-s", `${primaryHsl.s}%`);
		root.style.setProperty("--org-primary-l", `${primaryHsl.l}%`);

		root.style.setProperty("--org-secondary-h", String(secondaryHsl.h));
		root.style.setProperty("--org-secondary-s", `${secondaryHsl.s}%`);
		root.style.setProperty("--org-secondary-l", `${secondaryHsl.l}%`);

		return () => {
			// Cleanup
			root.style.removeProperty("--org-primary");
			root.style.removeProperty("--org-secondary");
			root.style.removeProperty("--color-brand");
			root.style.removeProperty("--org-primary-h");
			root.style.removeProperty("--org-primary-s");
			root.style.removeProperty("--org-primary-l");
			root.style.removeProperty("--org-secondary-h");
			root.style.removeProperty("--org-secondary-s");
			root.style.removeProperty("--org-secondary-l");
		};
	}, [colors]);

	const contextValue: OrgColorsContextValue = useMemo(
		() => ({
			colors,
			getPrimaryGradientStyle: () => {
				// Generate a gradient from a lighter to the primary color
				const primaryHsl = hexToHsl(colors.primary);
				const lighterColor = `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.min(primaryHsl.l + 25, 90)}%)`;
				return {
					background: `linear-gradient(to right, ${lighterColor}, ${colors.primary})`,
				};
			},
			getChartColors: () => ({
				current: colors.primary,
				previous: colors.secondary,
				goal: "#000000",
			}),
		}),
		[colors]
	);

	return <OrgColorsContext.Provider value={contextValue}>{children}</OrgColorsContext.Provider>;
}

export function useOrgColors(): OrgColorsContextValue {
	const context = useContext(OrgColorsContext);
	if (!context) {
		// Return default colors if used outside provider (e.g., in external pages)
		return {
			colors: DEFAULT_ORG_COLORS,
			getPrimaryGradientStyle: () => ({
				background: "linear-gradient(to right, #fde68a, #fbbf24)",
			}),
			getChartColors: () => ({
				current: DEFAULT_ORG_COLORS.primary,
				previous: DEFAULT_ORG_COLORS.secondary,
				goal: "#000000",
			}),
		};
	}
	return context;
}
