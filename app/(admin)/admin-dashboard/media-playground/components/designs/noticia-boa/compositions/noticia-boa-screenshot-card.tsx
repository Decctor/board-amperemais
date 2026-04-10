"use client";

import { NOTICIA_BOA_SCREENSHOT_URL } from "../constants";
import type { NoticiaBoaLayoutTokens } from "../scale";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

type NoticiaBoaScreenshotCardProps = {
	tokens: NoticiaBoaLayoutTokens;
	imageColumnWidth: number;
	/** Para analytics / export */
	dataDesignRole?: string;
};

/** Cartão branco + screenshot + escala para caber na coluna (reutilizado no quadrado, feed e reels) */
export function NoticiaBoaScreenshotCard({
	tokens,
	imageColumnWidth,
	dataDesignRole = "noticia-boa-screenshot-card",
}: NoticiaBoaScreenshotCardProps) {
	const { t, radiusLg } = tokens;
	const cf = 1.08;
	const padPx = Math.round(14 * t * cf);

	const colRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	const updateScale = useCallback(() => {
		const col = colRef.current;
		const card = cardRef.current;
		if (!col || !card) return;
		const h = col.clientHeight;
		const ch = card.offsetHeight;
		if (ch <= 0 || h <= 0) return;
		setScale(ch > h ? Math.max(0.05, h / ch) : 1);
	}, []);

	useLayoutEffect(() => {
		updateScale();
		const col = colRef.current;
		const card = cardRef.current;
		if (!col || !card) return;
		const ro = new ResizeObserver(() => updateScale());
		ro.observe(col);
		const img = card.querySelector("img");
		const onLoad = () => updateScale();
		img?.addEventListener("load", onLoad);
		if (img?.complete) queueMicrotask(updateScale);
		return () => {
			ro.disconnect();
			img?.removeEventListener("load", onLoad);
		};
	}, [updateScale]);

	return (
		<div
			ref={colRef}
			data-design-role={dataDesignRole}
			style={{
				flex: `0 0 ${imageColumnWidth}px`,
				width: imageColumnWidth,
				minWidth: 0,
				minHeight: 0,
				height: "100%",
				position: "relative",
			}}
		>
			<div
				ref={cardRef}
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					width: imageColumnWidth,
					boxSizing: "border-box",
					padding: padPx,
					borderRadius: Math.round(radiusLg * cf),
					background: "linear-gradient(165deg, #FFFFFF 0%, #F4F7FB 100%)",
					boxShadow:
						"0 18px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.7), 0 0 80px rgba(0,0,0,0.12)",
					transform: `translate(-50%, -50%) scale(${scale}) rotate(-0.9deg)`,
					transformOrigin: "center center",
				}}
			>
				<img
					src={NOTICIA_BOA_SCREENSHOT_URL}
					alt="Relatório semanal de vendas no WhatsApp via RecompraCRM"
					crossOrigin="anonymous"
					style={{
						display: "block",
						width: "100%",
						height: "auto",
						borderRadius: Math.round(12 * t),
						boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
					}}
				/>
			</div>
		</div>
	);
}
