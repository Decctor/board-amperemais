import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { NOTICIA_BOA_BG_GRADIENT, NOTICIA_BOA_FONT_STACK } from "../constants";

type NoticiaBoaCanvasProps = {
	width: number;
	height: number;
	className?: string;
	children: ReactNode;
};

export function NoticiaBoaCanvas({ width, height, className, children }: NoticiaBoaCanvasProps) {
	return (
		<div
			data-design-role="noticia-boa-canvas"
			className={cn(className)}
			style={{
				width,
				height,
				position: "relative",
				overflow: "hidden",
				fontFamily: NOTICIA_BOA_FONT_STACK,
				background: NOTICIA_BOA_BG_GRADIENT,
			}}
		>
			{children}
		</div>
	);
}
