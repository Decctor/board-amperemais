import { formatPercentage } from "./formatters";

export type TComparisonTone = {
	background: string;
	color: string;
};

export type TComparisonMeta = {
	label: string;
	deltaLabel: string;
	icon: string;
	tone: TComparisonTone;
};

/**
 * Builds a comparison badge (delta vs. previous period) used across report image cards.
 * Tones are semantic: success green for growth, destructive red for drops, neutral slate otherwise.
 */
export function getComparisonMeta(current: number, previous: number | undefined): TComparisonMeta {
	if (!previous || previous === 0) {
		return {
			label: "Sem base comparativa",
			deltaLabel: "N/A",
			icon: "•",
			tone: { background: "rgba(148,163,184,0.18)", color: "#475569" },
		};
	}

	const delta = ((current - previous) / Math.abs(previous)) * 100;
	if (!Number.isFinite(delta) || delta === 0) {
		return {
			label: "Estável",
			deltaLabel: "0%",
			icon: "•",
			tone: { background: "rgba(148,163,184,0.18)", color: "#475569" },
		};
	}

	if (delta > 0) {
		return {
			label: "Alta vs. anterior",
			deltaLabel: formatPercentage(delta),
			icon: "↑",
			tone: { background: "rgba(187,247,208,0.88)", color: "#15803D" },
		};
	}

	return {
		label: "Queda vs. anterior",
		deltaLabel: formatPercentage(Math.abs(delta)),
		icon: "↓",
		tone: { background: "rgba(254,205,211,0.92)", color: "#BE123C" },
	};
}

function hexToHsl(hex: string) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return { h: 0, s: 0, l: 0 };

	const r = Number.parseInt(result[1], 16) / 255;
	const g = Number.parseInt(result[2], 16) / 255;
	const b = Number.parseInt(result[3], 16) / 255;

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

/** Diagonal-friendly gradient derived from a single org brand color, used on hero surfaces. */
export function getPrimaryGradient(primary: string, angle = 90) {
	const primaryHsl = hexToHsl(primary);
	const lighterColor = `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.min(primaryHsl.l + 12, 78)}%)`;
	const darkerColor = `hsl(${primaryHsl.h}, ${Math.max(primaryHsl.s - 6, 0)}%, ${Math.max(primaryHsl.l - 8, 18)}%)`;

	return `linear-gradient(${angle}deg, ${lighterColor} 0%, ${primary} 58%, ${darkerColor} 100%)`;
}

/** Translucent tint of an org brand hex at a given alpha (0–1). Falls back to slate on parse failure. */
export function hexToRgba(hex: string, alpha: number) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return `rgba(36,84,156,${alpha})`;
	const r = Number.parseInt(result[1], 16);
	const g = Number.parseInt(result[2], 16);
	const b = Number.parseInt(result[3], 16);
	return `rgba(${r},${g},${b},${alpha})`;
}
