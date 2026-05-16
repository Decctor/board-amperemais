"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
	children: ReactNode;
	className?: string;
	once?: boolean;
	threshold?: number;
	rootMargin?: string;
	as?: "div" | "section" | "article" | "li" | "tr";
};

export function Reveal({ children, className, once = true, threshold = 0.2, rootMargin = "0px 0px -10% 0px", as: Tag = "div" }: RevealProps) {
	const ref = useRef<HTMLElement | null>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		if (typeof IntersectionObserver === "undefined") {
			setInView(true);
			return;
		}

		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setInView(true);
						if (once) obs.unobserve(entry.target);
					} else if (!once) {
						setInView(false);
					}
				}
			},
			{ threshold, rootMargin },
		);

		obs.observe(node);
		return () => obs.disconnect();
	}, [once, threshold, rootMargin]);

	return (
		// biome-ignore lint/suspicious/noExplicitAny: dynamic tag
		<Tag ref={ref as any} className={cn("ledger-reveal", className)} data-in-view={inView ? "true" : "false"}>
			{children}
		</Tag>
	);
}
