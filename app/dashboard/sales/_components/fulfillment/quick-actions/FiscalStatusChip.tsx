"use client";

import { FiscalDocumentPopoverContent } from "@/components/Fiscal/FiscalDocumentPopoverContent";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TSaleFiscalDerivedStatusEnum } from "@/schemas/enums";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FISCAL_BADGE_META } from "../config";

const FISCAL_TONE_CLASSES = {
	muted: "border border-border/60 bg-muted/30 text-muted-foreground",
	neutral: "border border-border/60 bg-muted/30 text-foreground/80",
	danger: "border border-destructive/30 bg-destructive/10 text-destructive",
} as const;

const ACTIONABLE_STATUSES = new Set<TSaleFiscalDerivedStatusEnum>(["REJEITADO", "ERRO", "AUTORIZADO", "EM_PROCESSAMENTO", "PENDENTE"]);

/**
 * Chip do status fiscal no card. Com documento e status acionavel, vira gatilho de um popover que
 * mostra o problema com CTA (ou XML/DANFE e janela de cancelamento) sem sair do quadro.
 */
export function FiscalStatusChip({ status, documentId }: { status: TSaleFiscalDerivedStatusEnum; documentId?: string | null }) {
	const meta = FISCAL_BADGE_META[status];
	const [open, setOpen] = useState(false);
	const actionable = !!documentId && ACTIONABLE_STATUSES.has(status);

	const chip = (
		<span
			className={cn(
				"inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-md px-2 text-[11px] font-semibold uppercase tracking-tight",
				FISCAL_TONE_CLASSES[meta.tone],
				actionable && "cursor-pointer hover:brightness-95",
			)}
		>
			{meta.icon ? <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{meta.icon}</span> : null}
			<span className="truncate">{meta.label}</span>
			{actionable ? <ChevronDown className="h-3 w-3 shrink-0 opacity-70" /> : null}
		</span>
	);

	if (!actionable || !documentId) return chip;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<button type="button" className="max-w-full text-left" onClick={(event) => event.stopPropagation()}>
						{chip}
					</button>
				}
			/>
			<PopoverContent align="end" className="w-auto p-3" onClick={(event) => event.stopPropagation()}>
				{open ? <FiscalDocumentPopoverContent documentId={documentId} onResolved={() => setOpen(false)} /> : null}
			</PopoverContent>
		</Popover>
	);
}
