import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { BG_GRADIENT, PIOR_DIA_FONT_STACK } from "../constants";

type PiorDiaCanvasProps = {
	width: number;
	height: number;
	className?: string;
	children: ReactNode;
};

export function PiorDiaCanvas({ width, height, className, children }: PiorDiaCanvasProps) {
	return (
		<div
			data-design-role="pior-dia-canvas"
			className={cn(className)}
			style={{
				width,
				height,
				position: "relative",
				overflow: "hidden",
				fontFamily: PIOR_DIA_FONT_STACK,
				background: BG_GRADIENT,
			}}
		>
			{children}
		</div>
	);
}
