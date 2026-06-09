import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CommunityPageShellProps = {
	children: ReactNode;
	className?: string;
	wide?: boolean;
};

export function CommunityPageShell({ children, className, wide = false }: CommunityPageShellProps) {
	return (
		<div className={cn("mx-auto w-full px-5 py-6 sm:px-8 sm:py-8", wide ? "max-w-6xl" : "max-w-5xl", className)}>
			{children}
		</div>
	);
}
