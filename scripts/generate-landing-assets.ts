import "dotenv/config";
import { generateImage } from "ai";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Gera as ilustrações da landing (public/images/landing) pelo Vercel AI Gateway.
// Direção de arte e prompts: docs/landing/asset-generation-prompts.md.
//
// Uso:
//   npx tsx ./scripts/generate-landing-assets.ts [--only a,b] [--variants 2] [--out .generated/landing]
//                                                [--no-refs] [--no-post] [--concurrency 3]
//
// Requer AI_GATEWAY_API_KEY no ambiente. Cada variante sai como
// <file>.v<n>.raw.png (saída do modelo) e <file>.v<n>.png (alpha validado,
// margens aparadas e silhueta normalizada para ocupar SAFE_AREA do canvas).
// A escolha da variante final é manual: copiar para public/images/landing/<file>.

const MODEL = "openai/gpt-image-2";
const SAFE_AREA = 0.78;
const OUT_DIR_DEFAULT = ".generated/landing";
const REFERENCE_DIR = "public/images/onboarding";
const REFERENCE_FILES = ["cashback-reward.png", "storefront.png"];

export const STYLE_PREFIX = [
	"Use the attached images ONLY as style reference (materials, palette, lighting, camera, level of stylization). Do not copy their objects. Create a NEW asset in exactly the same family.",
	"Production illustration asset for a premium Brazilian retail CRM landing page: cobalt blue #24549c, warm gold #ffb900, porcelain white and pale blue; toy-like miniature product render in satin ceramic and stiff matte resin (never fabric); precise rounded bevels; one coherent soft studio light from the upper left, bright and even, no glow, no light halo, no rim light; short soft contact shadow only; three-quarter front camera with restrained perspective.",
	"Canvas with actual transparent alpha background: everything outside the objects and their short contact shadow is fully transparent. No floor, no backdrop, no frame. Silhouette inside the central 78 percent with generous margin. No people, no logos, no lettering, no numbers, no currency symbols, no confetti, no sparkles, no watermark.",
].join("\n");

type TLandingAsset = {
	file: string;
	size: "1024x1024" | "1536x1024";
	subject: string;
};

export const LANDING_ASSETS: TLandingAsset[] = [
	{
		file: "hero-return-loop.png",
		size: "1536x1024",
		subject:
			"Landscape 3:2 canvas; the cluster occupies the central 80 percent. A refined still life that tells 'a purchase becomes the next visit': on the left a miniature porcelain storefront with a cobalt-and-porcelain striped awning and an EMPTY sign panel; center-right an upright slightly tilted porcelain smartphone with a cobalt frame and a blank pale screen, one rounded WhatsApp-green chat bubble floating beside it with no text; in front a small matte cobalt shopping bag with gold handles; a thick satin-gold coin with an embossed curved return arrow leaning against the bag. Objects arranged in a gentle arc reading left to right.",
	},
	{
		file: "bag-asleep.png",
		size: "1024x1024",
		subject:
			"A single matte cobalt shopping bag with gold handles, standing but slightly slumped, one handle drooping to the side; a tiny porcelain crescent moon floating above it. Stiff resin surfaces, not cloth. No other objects.",
	},
	{
		file: "calendar-hourglass.png",
		size: "1024x1024",
		subject:
			"A porcelain desk calendar block with cobalt binding rings and blank pages (no digits), and a satin-gold hourglass with pale blue sand standing beside it, sand almost fully run through to the bottom bulb.",
	},
	{
		file: "phone-pile.png",
		size: "1024x1024",
		subject:
			"An upright porcelain smartphone with a cobalt frame and blank screen, with an unruly stack of six rounded chat bubbles in pale blue and porcelain piled up and spilling over its top edge, one bubble tipping off the side. Bubbles are blank.",
	},
	{
		file: "poi-tablet.png",
		size: "1024x1024",
		subject:
			"A porcelain tablet on a small cobalt counter stand, angled toward the viewer, blank pale screen; a porcelain purchase receipt curling out from behind it with three embossed blue-gray lines and no text; a small matte cobalt shopping bag with gold handles at its foot.",
	},
	{
		file: "crm-sorter.png",
		size: "1024x1024",
		subject:
			"A cobalt porcelain sorting tray with three shallow compartments; several small round porcelain client tokens in pale blue rest in the compartments, and one satin-gold token is lifted above the tray as if being picked. A small gold gear leans at the base.",
	},
	{
		file: "message-out.png",
		size: "1024x1024",
		subject:
			"One large rounded WhatsApp-green chat bubble in satin ceramic with two embossed check marks (no letters), tilted as if just sent, hovering above a small matte cobalt shopping bag with gold handles; a smaller pale-blue reply bubble rising behind.",
	},
	{
		file: "campaign-triggers.png",
		size: "1024x1024",
		subject:
			"A porcelain alarm clock with cobalt hands and a satin-gold bell on top, blank face with no digits; three small floating porcelain tag cards with cobalt eyelets and gold string fanning out beside it, all blank.",
	},
	{
		file: "at-risk-lens.png",
		size: "1024x1024",
		subject:
			"A satin-gold magnifying glass with a cobalt handle hovering over three small round porcelain client tokens; the token under the lens is warm amber and slightly cracked, the other two are pale blue.",
	},
];

type TCliOptions = {
	only: string[];
	variants: number;
	out: string;
	refs: boolean;
	post: boolean;
	concurrency: number;
};

function parseArgs(argv: string[]): TCliOptions {
	const options: TCliOptions = { only: [], variants: 2, out: OUT_DIR_DEFAULT, refs: true, post: true, concurrency: 3 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--only") options.only = (argv[++i] ?? "").split(",").filter(Boolean);
		else if (arg === "--variants") options.variants = Number(argv[++i] ?? "2");
		else if (arg === "--out") options.out = argv[++i] ?? OUT_DIR_DEFAULT;
		else if (arg === "--concurrency") options.concurrency = Number(argv[++i] ?? "3");
		else if (arg === "--no-refs") options.refs = false;
		else if (arg === "--no-post") options.post = false;
		else throw new Error(`Argumento desconhecido: ${arg}`);
	}
	return options;
}

function parseSize(size: TLandingAsset["size"]) {
	const [width, height] = size.split("x").map(Number);
	return { width, height };
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Valida alpha, apara as margens vazias e recoloca a silhueta centralizada ocupando SAFE_AREA do canvas. */
export async function normalizeAsset(raw: Buffer, size: TLandingAsset["size"]) {
	const meta = await sharp(raw).metadata();
	if (!meta.hasAlpha) throw new Error("A imagem não tem canal alpha.");

	const { data, info } = await sharp(raw).raw().toBuffer({ resolveWithObject: true });
	let edgeMaxAlpha = 0;
	for (let x = 0; x < info.width; x++) {
		for (const y of [0, info.height - 1]) edgeMaxAlpha = Math.max(edgeMaxAlpha, data[(y * info.width + x) * 4 + 3]);
	}
	for (let y = 0; y < info.height; y++) {
		for (const x of [0, info.width - 1]) edgeMaxAlpha = Math.max(edgeMaxAlpha, data[(y * info.width + x) * 4 + 3]);
	}
	if (edgeMaxAlpha > 8) throw new Error(`Borda não é transparente (alpha máximo na borda: ${edgeMaxAlpha}).`);

	const trimmed = await sharp(raw).trim({ background: TRANSPARENT, threshold: 12 }).png().toBuffer();
	const trimmedMeta = await sharp(trimmed).metadata();
	const { width, height } = parseSize(size);
	const scale = Math.min((width * SAFE_AREA) / (trimmedMeta.width ?? width), (height * SAFE_AREA) / (trimmedMeta.height ?? height));
	const targetWidth = Math.round((trimmedMeta.width ?? width) * scale);
	const targetHeight = Math.round((trimmedMeta.height ?? height) * scale);

	const normalized = await sharp(trimmed)
		.resize(targetWidth, targetHeight, { fit: "fill", kernel: "lanczos3" })
		.extend({
			top: Math.floor((height - targetHeight) / 2),
			bottom: Math.ceil((height - targetHeight) / 2),
			left: Math.floor((width - targetWidth) / 2),
			right: Math.ceil((width - targetWidth) / 2),
			background: TRANSPARENT,
		})
		.png({ compressionLevel: 9, palette: false })
		.toBuffer();

	return { normalized, edgeMaxAlpha, trimmedWidth: trimmedMeta.width, trimmedHeight: trimmedMeta.height, scale };
}

async function loadReferences() {
	return Promise.all(REFERENCE_FILES.map((file) => readFile(path.join(REFERENCE_DIR, file))));
}

async function generateVariant({ asset, variant, references, options }: { asset: TLandingAsset; variant: number; references: Buffer[]; options: TCliOptions }) {
	const label = `${asset.file} v${variant}`;
	const text = `${options.refs ? STYLE_PREFIX : STYLE_PREFIX.split("\n").slice(1).join("\n")}\nSubject: ${asset.subject}`;
	const startedAt = Date.now();
	const result = await generateImage({
		model: MODEL,
		prompt: options.refs ? { images: references, text } : text,
		size: asset.size,
		providerOptions: { openai: { background: "transparent", quality: "high", output_format: "png" } },
	});
	const seconds = ((Date.now() - startedAt) / 1000).toFixed(0);
	if (result.warnings.length) console.warn(`[${label}] avisos:`, result.warnings);

	const raw = Buffer.from(result.images[0].base64, "base64");
	const base = path.join(options.out, asset.file.replace(/\.png$/, ""));
	await writeFile(`${base}.v${variant}.raw.png`, raw);

	if (!options.post) {
		console.log(`[${label}] ${seconds}s · raw salvo`);
		return;
	}
	try {
		const { normalized, edgeMaxAlpha, trimmedWidth, trimmedHeight, scale } = await normalizeAsset(raw, asset.size);
		await writeFile(`${base}.v${variant}.png`, normalized);
		console.log(`[${label}] ${seconds}s · ok · borda alpha ${edgeMaxAlpha} · silhueta ${trimmedWidth}×${trimmedHeight} · escala ${scale.toFixed(2)} · ${(normalized.length / 1024).toFixed(0)} KB`);
	} catch (error) {
		console.error(`[${label}] ${seconds}s · REPROVADO: ${error instanceof Error ? error.message : String(error)} (raw mantido)`);
	}
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
	let cursor = 0;
	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => {
			while (cursor < items.length) {
				const item = items[cursor++];
				await worker(item);
			}
		}),
	);
}

async function main() {
	if (!process.env.AI_GATEWAY_API_KEY) {
		console.error("AI_GATEWAY_API_KEY não definido.");
		process.exit(1);
	}
	const options = parseArgs(process.argv.slice(2));
	const assets = options.only.length ? LANDING_ASSETS.filter((asset) => options.only.includes(asset.file) || options.only.includes(asset.file.replace(/\.png$/, ""))) : LANDING_ASSETS;
	if (!assets.length) throw new Error("Nenhum asset selecionado.");

	await mkdir(options.out, { recursive: true });
	const references = options.refs ? await loadReferences() : [];
	const jobs = assets.flatMap((asset) => Array.from({ length: options.variants }, (_, index) => ({ asset, variant: index + 1 })));
	console.log(`Gerando ${jobs.length} imagens (${assets.length} assets × ${options.variants} variantes) com ${MODEL} em ${options.out}`);

	await runPool(jobs, options.concurrency, async ({ asset, variant }) => {
		try {
			await generateVariant({ asset, variant, references, options });
		} catch (error) {
			console.error(`[${asset.file} v${variant}] falhou: ${error instanceof Error ? error.message : String(error)}`);
		}
	});
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
