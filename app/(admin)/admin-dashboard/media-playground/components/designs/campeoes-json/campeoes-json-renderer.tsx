"use client";

import type { Spec } from "@json-render/react";
import { MediaJsonRenderer } from "../../json-render/media-json-renderer";
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
 * Bridge entre o playground e o renderer compartilhado do media JSON.
 */
export default function CampeoesJsonRenderer({ width, height, sizeKey }: CampeoesJsonRendererProps) {
	const spec = SPECS[sizeKey];

	return <MediaJsonRenderer width={width} height={height} spec={spec} layoutVariant={sizeKey} />;
}
