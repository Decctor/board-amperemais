"use client";

import { cn } from "@/lib/utils";
import type { TSaleFiscalDerivedStatusEnum } from "@/schemas/enums";
import { FISCAL_BADGE_META } from "../config";

const FISCAL_TONE_CLASSES = {
	muted: "border border-border/60 bg-muted/30 text-muted-foreground",
	neutral: "border border-border/60 bg-muted/30 text-foreground/80",
	danger: "border border-destructive/30 bg-destructive/10 text-destructive",
} as const;

export function FiscalStatusChip({ status }: { status: TSaleFiscalDerivedStatusEnum }) {
	const meta = FISCAL_BADGE_META[status];

	return (
		<span
			className={cn(
				"inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-md px-2 text-[11px] font-semibold uppercase tracking-tight",
				FISCAL_TONE_CLASSES[meta.tone],
			)}
		>
			{meta.icon ? <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{meta.icon}</span> : null}
			<span className="truncate">{meta.label}</span>
		</span>
	);
}
