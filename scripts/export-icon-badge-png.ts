// Rasteriza o icon-badge (a cápsula sem o wordmark — único lockup aprovado para superfície
// desconhecida) em PNG para `public/`, consumido pelo `serverInfo.icons` do endpoint MCP.
// Mesma fonte SVG do registry de brand (utils/svgs/logos); rode após qualquer mudança no asset:
//   npm run brand:export-icon-badge
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_SVG = path.join(process.cwd(), "utils", "svgs", "logos", "icon-badge-color.svg");
const SIZES = [192, 512];

async function main() {
	const svg = await fs.readFile(SOURCE_SVG, "utf8");
	for (const size of SIZES) {
		const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size }, font: { loadSystemFonts: false } });
		const outputPath = path.join(process.cwd(), "public", `icon-badge-${size}.png`);
		await fs.writeFile(outputPath, resvg.render().asPng());
		console.log(`PNG: ${outputPath}`);
	}
}

void main().catch((error) => {
	console.error("[EXPORT_ICON_BADGE] Failed:", error);
	process.exit(1);
});
