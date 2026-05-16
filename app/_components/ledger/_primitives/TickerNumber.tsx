"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type TickerNumberProps = {
	value: number;
	durationMs?: number;
	className?: string;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	thousandsSep?: string;
	decimalSep?: string;
	startOnView?: boolean;
};

function easeOutQuint(t: number) {
	return 1 - (1 - t) ** 5;
}

function formatNumber(n: number, decimals: number, thousands: string, decimal: string) {
	const fixed = n.toFixed(decimals);
	const [intPart, decPart] = fixed.split(".");
	const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
	return decPart ? `${intWithSep}${decimal}${decPart}` : intWithSep;
}

export function TickerNumber({
	value,
	durationMs = 1400,
	className,
	prefix = "",
	suffix = "",
	decimals = 0,
	thousandsSep = ".",
	decimalSep = ",",
	startOnView = true,
}: TickerNumberProps) {
	const ref = useRef<HTMLSpanElement | null>(null);
	const [display, setDisplay] = useState(startOnView ? 0 : value);
	const startedRef = useRef(false);

	useEffect(() => {
		const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduceMotion) {
			setDisplay(value);
			return;
		}

		if (!startOnView) {
			runAnimation();
			return;
		}

		const node = ref.current;
		if (!node || typeof IntersectionObserver === "undefined") {
			runAnimation();
			return;
		}

		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && !startedRef.current) {
						startedRef.current = true;
						runAnimation();
						obs.disconnect();
					}
				}
			},
			{ threshold: 0.4 },
		);
		obs.observe(node);

		function runAnimation() {
			startedRef.current = true;
			const start = performance.now();
			const from = 0;
			const to = value;
			let raf = 0;
			const tick = (now: number) => {
				const t = Math.min(1, (now - start) / durationMs);
				const eased = easeOutQuint(t);
				setDisplay(from + (to - from) * eased);
				if (t < 1) raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(raf);
		}

		return () => obs.disconnect();
	}, [value, durationMs, startOnView]);

	return (
		<span ref={ref} className={cn("ledger-tabular", className)}>
			{prefix}
			{formatNumber(display, decimals, thousandsSep, decimalSep)}
			{suffix}
		</span>
	);
}
