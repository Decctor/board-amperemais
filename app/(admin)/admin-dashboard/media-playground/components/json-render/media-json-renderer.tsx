"use client";

import type { Spec } from "@json-render/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { mediaRegistry } from "./registry";
import { MediaRenderContext } from "./render-context";
import { getMediaJsonInitialState, getMediaRenderTokens, type TMediaLayoutVariant } from "./tokens";

type MediaJsonRendererProps = {
	width: number;
	height: number;
	spec: Spec;
	layoutVariant?: TMediaLayoutVariant;
};

export function MediaJsonRenderer({ width, height, spec, layoutVariant = "feed" }: MediaJsonRendererProps) {
	const tokens = getMediaRenderTokens(height);
	const initialState = getMediaJsonInitialState(width, height, layoutVariant);

	return (
		<JSONUIProvider registry={mediaRegistry} initialState={initialState} handlers={{}}>
			<MediaRenderContext.Provider value={{ width, height, tokens }}>
				<Renderer spec={spec} registry={mediaRegistry} />
			</MediaRenderContext.Provider>
		</JSONUIProvider>
	);
}
