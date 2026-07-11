import { renderBrandAssetPng, renderBrandAssetSvg } from "@/lib/brand/render";
import { BRAND_TEMPLATES } from "@/lib/brand/templates";
import fs from "node:fs/promises";
import path from "node:path";

function getArgValue(flag: string) {
	const index = process.argv.indexOf(flag);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

async function main() {
	const templateArg = getArgValue("--template");
	const variantArg = getArgValue("--variant");
	const format = getArgValue("--format") ?? "png";

	if (!["png", "svg", "both"].includes(format)) {
		throw new Error("Informe --format png|svg|both.");
	}

	const templateNames = templateArg ? [templateArg] : Object.keys(BRAND_TEMPLATES);
	const outputDir = path.join(process.cwd(), "exports", "brand");
	await fs.mkdir(outputDir, { recursive: true });

	for (const templateName of templateNames) {
		const template = BRAND_TEMPLATES[templateName];
		if (!template) {
			throw new Error(`Template desconhecido: ${templateName}. Disponíveis: ${Object.keys(BRAND_TEMPLATES).join(", ")}`);
		}

		const variants = variantArg ? [variantArg] : template.variants;

		for (const variant of variants) {
			if (!template.variants.includes(variant)) {
				throw new Error(`Variante desconhecida: ${variant}. Disponíveis: ${template.variants.join(", ")}`);
			}

			const element = await template.render(variant);
			const fileBaseName = `${templateName}-${variant}`;
			const renderOptions = { element, width: template.width, height: template.height };

			if (format === "svg" || format === "both") {
				const svg = await renderBrandAssetSvg(renderOptions);
				const svgPath = path.join(outputDir, `${fileBaseName}.svg`);
				await fs.writeFile(svgPath, svg, "utf8");
				console.log(`SVG: ${svgPath}`);
			}

			if (format === "png" || format === "both") {
				const png = await renderBrandAssetPng(renderOptions);
				const pngPath = path.join(outputDir, `${fileBaseName}.png`);
				await fs.writeFile(pngPath, png);
				console.log(`PNG: ${pngPath}`);
			}
		}
	}
}

void main().catch((error) => {
	console.error("[EXPORT_BRAND_ASSET] Failed:", error);
	process.exit(1);
});
