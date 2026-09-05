"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

type QuickActionRowProps = {
	label: string;
	tooltip?: string;
	children: ReactNode;
};

export function QuickActionRow({ label, tooltip, children }: QuickActionRowProps) {
	const row = (
		<div className="flex min-h-7 items-center justify-between gap-3">
			<span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<div className="flex min-w-0 items-center justify-end">{children}</div>
		</div>
	);

	if (!tooltip) return row;

	return (
		<Tooltip>
			<TooltipTrigger render={row} />
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
