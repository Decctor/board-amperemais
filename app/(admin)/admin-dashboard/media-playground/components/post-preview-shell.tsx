"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

type PostPreviewShellProps = {
	width: number;
	height: number;
	contentRef: RefObject<HTMLDivElement | null>;
	children: React.ReactNode;
};

export default function PostPreviewShell({ width, height, contentRef, children }: PostPreviewShellProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.4);

	useEffect(() => {
		function updateScale() {
			if (!containerRef.current) return;
			const containerWidth = containerRef.current.clientWidth;
			// Leave some padding (40px each side)
			const availableWidth = containerWidth - 40;
			const newScale = Math.min(availableWidth / width, 0.65);
			setScale(newScale);
		}

		updateScale();
		const observer = new ResizeObserver(updateScale);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [width]);

	return (
		<div ref={containerRef} className="w-full flex flex-col items-center">
			<div
				style={{
					width: `${width * scale}px`,
					height: `${height * scale}px`,
					overflow: "hidden",
					borderRadius: "8px",
					boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
				}}
			>
				<div
					ref={contentRef}
					style={{
						width: `${width}px`,
						height: `${height}px`,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					{children}
				</div>
			</div>
			<p className="text-xs text-muted-foreground mt-2">
				{width} × {height}px • Preview em {Math.round(scale * 100)}%
			</p>
		</div>
	);
}
