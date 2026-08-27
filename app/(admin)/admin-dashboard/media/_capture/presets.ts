import { BRAND_COLORS } from "@/lib/brand/tokens";

export type TCapturePreset = {
	key: string;
	label: string;
	/** `null` deixa o frame com a largura natural do conteúdo. */
	width: number | null;
	height: number | null;
};

export const CAPTURE_PRESETS: TCapturePreset[] = [
	{ key: "fit", label: "Conteúdo", width: null, height: null },
	{ key: "feed-4-5", label: "Feed 4:5", width: 1080, height: 1350 },
	{ key: "feed-1-1", label: "Feed 1:1", width: 1080, height: 1080 },
	{ key: "story", label: "Story 9:16", width: 1080, height: 1920 },
	{ key: "og", label: "OG 1200×630", width: 1200, height: 630 },
	{ key: "hero", label: "Hero 16:9", width: 1600, height: 900 },
];

export type TCaptureBackground = {
	key: string;
	label: string;
	/** `null` = transparente. `"surface"` = usa o fundo do próprio app (bg-background). */
	color: string | null;
	surface?: boolean;
};

export const CAPTURE_BACKGROUNDS: TCaptureBackground[] = [
	{ key: "surface", label: "App", color: null, surface: true },
	{ key: "transparent", label: "Transparente", color: null },
	{ key: "white", label: "Branco", color: BRAND_COLORS.white },
	{ key: "black", label: "Preto", color: BRAND_COLORS.black },
	{ key: "blue", label: "Azul", color: BRAND_COLORS.blue },
	{ key: "amber", label: "Amarelo", color: BRAND_COLORS.amber },
	{ key: "red", label: "Vermelho", color: BRAND_COLORS.red },
];

/** Largura em que o conteúdo é renderizado antes de ser escalado para dentro do frame. */
export const CONTENT_WIDTH_PRESETS = [
	{ key: "desktop", label: "Desktop", width: 1440 },
	{ key: "laptop", label: "Laptop", width: 1280 },
	{ key: "tablet", label: "Tablet", width: 900 },
	{ key: "mobile", label: "Mobile", width: 420 },
];
