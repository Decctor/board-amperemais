"use client";

import { createContext, useContext } from "react";
import type { TMediaRenderTokens } from "./tokens";

type MediaRenderContextValue = {
	width: number;
	height: number;
	tokens: TMediaRenderTokens;
};

export const MediaRenderContext = createContext<MediaRenderContextValue | null>(null);

export function useMediaRenderContext() {
	const context = useContext(MediaRenderContext);

	if (!context) {
		throw new Error("MediaRenderContext não encontrado. Use MediaJsonRenderer.");
	}

	return context;
}
