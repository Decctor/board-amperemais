import fs from "node:fs/promises";
import path from "node:path";

const LOGOS_DIR = path.join(process.cwd(), "utils", "svgs", "logos");

/**
 * Registry dos logos oficiais disponíveis para templates de brand assets.
 * As chaves descrevem orientação + esquema de cor; os arquivos vivem em
 * `utils/svgs/logos/`.
 */
export const BRAND_LOGOS = {
	horizontalColorful: "RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg",
	horizontalColorfulTextBlack: "RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL TEXT-BLACK.svg",
	horizontalColorfulBadgeTextBlack: "RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL ICON-BADGE TEXT-BLACK.svg",
	horizontalBlack: "RECOMPRA - COMPLETE - HORIZONTAL- BLACK.svg",
	horizontalWhite: "RECOMPRA - COMPLETE - HORIZONTAL- WHITE.svg",
	verticalColorful: "RECOMPRA - COMPLETE - VERTICAL - COLORFUL.svg",
	verticalBlack: "RECOMPRA - COMPLETE - VERTICAL - BLACK.svg",
	verticalWhite: "RECOMPRA - COMPLETE - VERTICAL - WHITE.svg",
	iconColorful: "RECOMPRA - ICON - COLORFUL.svg",
} as const;

export type TBrandLogoKey = keyof typeof BRAND_LOGOS;

export type TBrandLogoAsset = {
	key: TBrandLogoKey;
	width: number;
	height: number;
	dataUrl: string;
};

function parseSvgViewBox(svg: string) {
	const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
	if (!match) return null;
	return { width: Number(match[1]), height: Number(match[2]) };
}

/**
 * Carrega um logo como data URL (para uso em `<img>` dentro de templates
 * satori) junto com as dimensões intrínsecas do SVG.
 */
export async function loadBrandLogo(key: TBrandLogoKey): Promise<TBrandLogoAsset> {
	const filePath = path.join(LOGOS_DIR, BRAND_LOGOS[key]);
	const svg = await fs.readFile(filePath, "utf8");
	const size = parseSvgViewBox(svg);
	if (!size) throw new Error(`Não foi possível ler o viewBox do logo: ${BRAND_LOGOS[key]}`);

	return {
		key,
		...size,
		dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
	};
}
