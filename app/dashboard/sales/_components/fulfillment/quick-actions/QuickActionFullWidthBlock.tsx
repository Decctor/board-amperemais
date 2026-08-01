"use client";

import type { ReactNode } from "react";

type QuickActionFullWidthBlockProps = {
	label: string;
	children: ReactNode;
};

export function QuickActionFullWidthBlock({ label, children }: QuickActionFullWidthBlockProps) {
	return (
		<div className="flex w-full flex-col gap-1">
			<span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<p className="w-full rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-[11px] leading-snug whitespace-pre-wrap text-foreground/85">
				{children}
			</p>
		</div>
	);
}
