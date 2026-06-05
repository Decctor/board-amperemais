"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
	duration?: number;
	pauseOnHover?: boolean;
	direction?: "left" | "right";
	fade?: boolean;
	fadeAmount?: number;
}

export function Marquee({
	children,
	className,
	style,
	duration = 20,
	pauseOnHover = false,
	direction = "left",
	fade = true,
	fadeAmount = 10,
	...props
}: MarqueeProps) {
	const rootRef = React.useRef<HTMLDivElement>(null);
	const scrollerRef = React.useRef<HTMLDivElement>(null);
	const [isPaused, setIsPaused] = React.useState(false);
	const [distance, setDistance] = React.useState(0);
	const cssVars = {
		"--marquee-duration": `${duration}s`,
		"--marquee-distance": `${distance}px`,
		"--marquee-edge-fade": `${fadeAmount}%`,
	} as React.CSSProperties;

	React.useEffect(() => {
		const root = rootRef.current;
		const scroller = scrollerRef.current;
		if (!root || !scroller) return;
		const viewport = root.parentElement;

		const measure = () => {
			const viewportWidth = viewport?.clientWidth || root.clientWidth;
			setDistance(Math.min(0, viewportWidth - scroller.scrollWidth));
		};

		measure();

		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", measure);
			return () => window.removeEventListener("resize", measure);
		}

		const observer = new ResizeObserver(measure);
		observer.observe(root);
		if (viewport) observer.observe(viewport);
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [children]);

	return (
		<div
			ref={rootRef}
			className={cn("marquee-root flex w-full max-w-full overflow-visible", className)}
			style={{
				...style,
				...cssVars,
				...(fade && {
					maskImage:
						"linear-gradient(to right, transparent 0%, black var(--marquee-edge-fade), black calc(100% - var(--marquee-edge-fade)), transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to right, transparent 0%, black var(--marquee-edge-fade), black calc(100% - var(--marquee-edge-fade)), transparent 100%)",
				}),
			}}
			{...props}
			onMouseEnter={(event) => {
				if (pauseOnHover) setIsPaused(true);
				props.onMouseEnter?.(event);
			}}
			onMouseLeave={(event) => {
				if (pauseOnHover) setIsPaused(false);
				props.onMouseLeave?.(event);
			}}
			onPointerDown={(event) => {
				setIsPaused(true);
				props.onPointerDown?.(event);
			}}
			onWheel={(event) => {
				setIsPaused(true);
				props.onWheel?.(event);
			}}
		>
			<div className={cn("marquee-scroller flex shrink-0", isPaused && "is-paused")} data-direction={direction}>
				<div ref={scrollerRef} className="flex w-max shrink-0">
					{children}
				</div>
			</div>
		</div>
	);
}
