import fs from "node:fs/promises";
import path from "node:path";

const LOGOS_DIR = path.join(process.cwd(), "utils", "svgs", "logos");
const INTEGRATION_LOGOS_DIR = path.join(process.cwd(), "utils", "images", "integrations");

/**
 * Registry dos logos oficiais disponíveis para templates de brand assets.
 * Espelha `BRAND_LOGO_SOURCES` de `components/Brand/BrandLogo.tsx` — mesmos
 * eixos (lockup + tom), mesmos arquivos em `utils/svgs/logos/`. Se um lado
 * mudar, mude o outro.
 *
 * Lembre que `colorOnDark` traz duas barras brancas no símbolo: em fundo claro
 * use `badgeColorOnLight` ou uma variante monocromática.
 */
export const BRAND_LOGOS = {
	iconColorOnDark: "icon-color-on-dark.svg",
	iconBadgeColor: "icon-badge-color.svg",
	iconBlack: "icon-black.svg",
	iconWhite: "icon-white.svg",
	iconBlue: "icon-blue.svg",
	wordmarkBlack: "wordmark-black.svg",
	wordmarkWhite: "wordmark-white.svg",
	wordmarkBlue: "wordmark-blue.svg",
	horizontalColorOnDark: "horizontal-color-on-dark.svg",
	horizontalBlack: "horizontal-black.svg",
	horizontalWhite: "horizontal-white.svg",
	horizontalBlue: "horizontal-blue.svg",
	horizontalBadgeColorOnLight: "horizontal-badge-color-on-light.svg",
	horizontalBadgeColorOnDark: "horizontal-badge-color-on-dark.svg",
	stackedColorOnDark: "stacked-color-on-dark.svg",
	stackedBlack: "stacked-black.svg",
	stackedWhite: "stacked-white.svg",
	stackedBlue: "stacked-blue.svg",
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

// Aceita origem diferente de zero — `viewBox="minX minY w h"` é SVG válido, e
// assumir "0 0" já quebrou silenciosamente ao adicionar um asset recortado.
function parseSvgViewBox(svg: string) {
	const match = svg.match(/viewBox="\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
	if (!match) return null;
	return { width: Number(match[3]), height: Number(match[4]) };
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
