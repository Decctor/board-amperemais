"use client";

import type { Spec } from "@json-render/react";
import { Renderer } from "@json-render/react";
import { getVerticalScale } from "../campeoes/scale";
import { CampeoesRenderContext, campeoesRegistry } from "./registry";
import feedSpec from "./specs/campeoes-feed.spec.json";
import reelsSpec from "./specs/campeoes-reels.spec.json";
import squareSpec from "./specs/campeoes-quadrado.spec.json";

const SPECS: Record<string, Spec> = {
	feed: feedSpec as Spec,
	reels: reelsSpec as Spec,
	square: squareSpec as Spec,
};

type CampeoesJsonRendererProps = {
	width: number;
	height: number;
	sizeKey: "feed" | "reels" | "square";
};

/**
 * Bridge entre o media playground e o json-render.
 *
 * Recebe width/height do shell do playground, calcula os tokens de escala,
 * injeta-os via CampeoesRenderContext e delega a renderização ao <Renderer>.
 *
 * O spec JSON define quais componentes montar e quais dados passar.
 * O registry mapeia os tipos do catálogo para os componentes React reais.
 */
export default function CampeoesJsonRenderer({ width, height, sizeKey }: CampeoesJsonRendererProps) {
	const tokens = getVerticalScale(height);
	const spec = SPECS[sizeKey];

	return (
		<CampeoesRenderContext.Provider value={{ tokens, width }}>
			<Renderer spec={spec} registry={campeoesRegistry} />
		</CampeoesRenderContext.Provider>
	);
}
