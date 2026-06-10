import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ConnectionBrandmarkProps = {
	left: ReactNode;
	right: ReactNode;
	leftClassName?: string;
	rightClassName?: string;
	className?: string;
};

/**
 * Two overlapping brand circles ("RecompraCRM + WhatsApp", "Meta + WhatsApp") used to visually frame
 * a connection. Shared between the dashboard settings and the onboarding connection stages.
 */
export function ConnectionBrandmark({ left, right, leftClassName, rightClassName, className }: ConnectionBrandmarkProps) {
	return (
		<div className={cn("flex items-center", className)}>
			<div
				className={cn(
					"z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-md ring-1 ring-black/5",
					leftClassName,
				)}
			>
				{left}
			</div>
			<div
				className={cn(
					"-ml-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-md ring-1 ring-black/5",
					rightClassName,
				)}
			>
				{right}
			</div>
		</div>
	);
}
