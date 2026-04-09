import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { BG_GRADIENT, CAMPEOES_FONT_STACK } from "../constants";

type CampeoesCanvasProps = {
	width: number;
	height: number;
	className?: string;
	children: ReactNode;
};

export function CampeoesCanvas({ width, height, className, children }: CampeoesCanvasProps) {
	return (
		<div
			data-design-role="campeoes-canvas"
			className={cn(className)}
			style={{
				width,
				height,
				position: "relative",
				overflow: "hidden",
				fontFamily: CAMPEOES_FONT_STACK,
				background: BG_GRADIENT,
			}}
		>
			{children}
		</div>
	);
}
