"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type PiorDiaWorkflowFitColumnProps = {
	children: ReactNode;
	className?: string;
};

/**
 * Encaixa o workflow vertical na altura (e largura) da coluna, com scale uniforme.
 * Usado no formato quadrado: mesma hierarquia visual do reels, com escala automática.
 */
export function PiorDiaWorkflowFitColumn({ children, className }: PiorDiaWorkflowFitColumnProps) {
	const outerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const [clipHeight, setClipHeight] = useState(0);

	const updateScale = useCallback(() => {
		const outer = outerRef.current;
		const inner = innerRef.current;
		if (!outer || !inner) return;
		const oh = outer.clientHeight;
		const ow = outer.clientWidth;
		if (oh <= 0 || ow <= 0) return;

		const prev = inner.style.transform;
		inner.style.transform = "none";
		const ih = inner.scrollHeight;
		const iw = inner.scrollWidth;
		inner.style.transform = prev;

		if (ih <= 0 || iw <= 0) return;
		const s = Math.min(1, oh / ih, ow / iw);
		setScale(s);
		setClipHeight(ih * s);
	}, []);

	useLayoutEffect(() => {
		updateScale();
		const outer = outerRef.current;
		const inner = innerRef.current;
		if (!outer || !inner) return;

		const ro = new ResizeObserver(() => updateScale());
		ro.observe(outer);
		ro.observe(inner);
		return () => ro.disconnect();
	}, [updateScale]);

	return (
		<div
			ref={outerRef}
			className={className}
			data-design-role="pior-dia-workflow-fit-column"
			style={{
				flex: 1,
				minHeight: 0,
				minWidth: 0,
				width: "100%",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
			}}
		>
			<div
				data-design-role="pior-dia-workflow-clip"
				style={{
					width: "100%",
					height: clipHeight > 0 ? clipHeight : "100%",
					overflow: "hidden",
					flexShrink: 0,
				}}
			>
				<div
					ref={innerRef}
					style={{
						width: "100%",
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
