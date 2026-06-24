import { cn } from "@/lib/utils";
import { createElement, type ReactNode } from "react";

type RevealProps = {
	children: ReactNode;
	className?: string;
	as?: "div" | "section" | "article" | "li" | "tr";
	once?: boolean;
	threshold?: number;
	rootMargin?: string;
};

export function Reveal({ children, className, as = "div" }: RevealProps) {
	return createElement(as, { className: cn("ledger-reveal", className) }, children);
}
