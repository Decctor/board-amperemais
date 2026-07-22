import fs from "node:fs/promises";
import path from "node:path";

const LOGOS_DIR = path.join(process.cwd(), "utils", "svgs", "logos");
const INTEGRATION_LOGOS_DIR = path.join(process.cwd(), "utils", "images", "integrations");

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

/**
 * Registry dos logos de parceiros de integração disponíveis para templates.
 * Os arquivos (PNG) vivem em `utils/images/integrations/` — os mesmos usados
 * nas landing pages de integração.
 */
export const INTEGRATION_LOGOS = {
	bling: "bling-logo.png",
	"cardapio-web": "cardapio-web.png",
	ifood: "ifood-logo.png",
	"nuvem-shop": "nuvemshop-logo.png",
	"online-software": "online-software-logo.png",
} as const;

export type TIntegrationLogoKey = keyof typeof INTEGRATION_LOGOS;

export type TIntegrationLogoAsset = {
	key: TIntegrationLogoKey;
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

// O IHDR é sempre o primeiro chunk de um PNG, então largura/altura ficam em
// offsets fixos (16 e 20) — suficiente aqui, sem puxar dependência de imagem.
function parsePngSize(buffer: Buffer) {
	if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) return null;
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Carrega o logo de um parceiro de integração como data URL (para uso em
 * `<img>` dentro de templates satori) junto com as dimensões intrínsecas.
 */
export async function loadIntegrationLogo(key: TIntegrationLogoKey): Promise<TIntegrationLogoAsset> {
	const filePath = path.join(INTEGRATION_LOGOS_DIR, INTEGRATION_LOGOS[key]);
	const buffer = await fs.readFile(filePath);
	const size = parsePngSize(buffer);
	if (!size) throw new Error(`Não foi possível ler as dimensões do logo: ${INTEGRATION_LOGOS[key]}`);

	return {
		key,
		...size,
		dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
	};
}
