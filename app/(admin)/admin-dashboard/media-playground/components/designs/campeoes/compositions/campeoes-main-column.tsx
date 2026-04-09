import { cn } from "@/lib/utils";
import type { CampeoesLayoutTokens } from "../scale";
import type { ReactNode } from "react";

type CampeoesMainColumnProps = {
	tokens: CampeoesLayoutTokens;
	className?: string;
	children: ReactNode;
};

export function CampeoesMainColumn({ tokens, className, children }: CampeoesMainColumnProps) {
	const { padTop, padX, padBottom, sectionGap } = tokens;
	return (
		<div
			data-design-role="campeoes-main-column"
			className={cn(className)}
			style={{
				position: "relative",
				zIndex: 1,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				gap: sectionGap,
				padding: `${padTop}px ${padX}px ${padBottom}px`,
				boxSizing: "border-box",
			}}
		>
			{children}
		</div>
	);
}
