import { toJpeg, toPng, toSvg } from "html-to-image";

export type TExportFormat = "png" | "jpeg" | "svg";

export type TExportNodeOptions = {
	/** Multiplicador de resolução do raster. Ignorado no SVG. */
	pixelRatio?: number;
	/** Cor de fundo aplicada ao canvas antes da captura (útil para JPEG, que não tem alfa). */
	backgroundColor?: string;
	/** Qualidade do JPEG, entre 0 e 1. */
	quality?: number;
};

const FORMAT_EXTENSIONS: Record<TExportFormat, string> = {
	png: "png",
	jpeg: "jpg",
	svg: "svg",
};

export function downloadDataUrl(dataUrl: string, filename: string) {
	const link = document.createElement("a");
	link.download = filename;
	link.href = dataUrl;
	link.click();
}

/**
 * Serializa um nó do DOM para data URL. As fontes precisam estar carregadas antes
 * da captura, senão o arquivo sai com a fonte de fallback.
 */
export async function renderNodeToDataUrl(node: HTMLElement, format: TExportFormat = "png", options: TExportNodeOptions = {}) {
	await document.fonts.ready;

	const { pixelRatio = 2, backgroundColor, quality = 0.95 } = options;
	const htmlToImageOptions = { pixelRatio, cacheBust: true, quality, backgroundColor };

	if (format === "svg") return toSvg(node, htmlToImageOptions);
	if (format === "jpeg") return toJpeg(node, htmlToImageOptions);
	return toPng(node, htmlToImageOptions);
}

/** Captura o nó e dispara o download do arquivo. `filename` vai sem extensão. */
export async function exportNode(node: HTMLElement, filename: string, format: TExportFormat = "png", options: TExportNodeOptions = {}) {
	const dataUrl = await renderNodeToDataUrl(node, format, options);
	downloadDataUrl(dataUrl, `${filename}.${FORMAT_EXTENSIONS[format]}`);
	return dataUrl;
}

/** Copia a captura do nó para a área de transferência como PNG. */
export async function copyNodeToClipboard(node: HTMLElement, options: TExportNodeOptions = {}) {
	const dataUrl = await renderNodeToDataUrl(node, "png", options);
	const blob = await (await fetch(dataUrl)).blob();
	await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
