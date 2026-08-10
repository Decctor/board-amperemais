"use client";

import { useEffect, useState } from "react";

/**
 * Cor dominante da BORDA da logo de uma organização — a cor do "papel" em que a marca foi
 * exportada.
 *
 * Existe por um motivo só: a logo que a organização envia quase nunca é transparente. É um PNG/JPG
 * quadrado com fundo próprio (branco, preto, a cor da marca), e qualquer chip que a envolva com uma
 * cor diferente faz a logo parecer colada por cima. Amostrando a borda da imagem e pintando o chip
 * com ela, a moldura desaparece dentro da própria logo.
 *
 * Só a borda é lida (faixa de 8px): o miolo é o desenho da marca, não o fundo. Pixels
 * quase-transparentes são ignorados (logo realmente recortada não tem "fundo" a copiar — o
 * consumidor fica com o padrão dele), e as cores são agrupadas de 16 em 16 para que um degradê
 * suave não se dissolva em milhares de tons únicos.
 *
 * Client-only: usa `canvas` do DOM.
 */

const SAMPLE_CANVAS_SIZE = 80;
const EDGE_BAND_SIZE = 8;
// Abaixo disto o pixel é transparente o bastante para não representar fundo nenhum.
const MIN_OPAQUE_ALPHA = 180;
const COLOR_BUCKET_STEP = 16;

/** Fundo neutro quando não há logo, quando ela é recortada ou quando a leitura falha. */
export const DEFAULT_LOGO_CHIP_COLOR = "#FFFFFF";

export async function getImageEdgeColor(src: string): Promise<string | null> {
	const image = new Image();
	image.crossOrigin = "anonymous";
	image.decoding = "async";
	image.src = src;
	await image.decode();

	const canvas = document.createElement("canvas");
	const size = SAMPLE_CANVAS_SIZE;
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;

	context.drawImage(image, 0, 0, size, size);
	const { data } = context.getImageData(0, 0, size, size);
	const edgeSize = EDGE_BAND_SIZE;
	const buckets = new Map<string, number>();

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const isEdgePixel = x < edgeSize || x >= size - edgeSize || y < edgeSize || y >= size - edgeSize;
			if (!isEdgePixel) continue;

			const index = (y * size + x) * 4;
			const alpha = data[index + 3] ?? 0;
			if (alpha < MIN_OPAQUE_ALPHA) continue;

			const r = data[index] ?? 255;
			const g = data[index + 1] ?? 255;
			const b = data[index + 2] ?? 255;
			const bucket = [r, g, b].map((channel) => Math.round(channel / COLOR_BUCKET_STEP) * COLOR_BUCKET_STEP).join(",");
			buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
		}
	}

	const dominant = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
	if (!dominant) return null;

	const [r, g, b] = dominant.split(",").map((value) => Number(value));
	return `rgb(${r}, ${g}, ${b})`;
}

/**
 * A cor da borda da logo, resolvida no cliente.
 *
 * Devolve `null` enquanto a leitura não terminou e sempre que ela não produz resposta (sem logo,
 * logo recortada, imagem de outro domínio sem CORS, canvas indisponível). `null` é deliberado, e não
 * um branco: cada chip tem o próprio fundo de repouso — branco no cabeçalho e na carteirinha, a
 * lavagem da marca na boas-vindas — e trocá-lo por uma cor inventada seria pior do que não fazer
 * nada. Use `DEFAULT_LOGO_CHIP_COLOR` onde o repouso é branco.
 */
export function useLogoEdgeColor(logoUrl: string | null | undefined): string | null {
	const [edgeColor, setEdgeColor] = useState<string | null>(null);

	useEffect(() => {
		if (!logoUrl) {
			setEdgeColor(null);
			return;
		}

		let active = true;
		getImageEdgeColor(logoUrl)
			.then((color) => {
				if (active) setEdgeColor(color);
			})
			.catch(() => {
				if (active) setEdgeColor(null);
			});

		return () => {
			active = false;
		};
	}, [logoUrl]);

	return edgeColor;
}
