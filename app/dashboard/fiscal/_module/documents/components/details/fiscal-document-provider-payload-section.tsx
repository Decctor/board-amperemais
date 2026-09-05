"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatJsonForDisplay } from "@/lib/fiscal/document-details-view";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyValueButton, DetailsSection } from "./details-section";

function JsonPanel({ title, value }: { title: string; value: unknown }) {
	const [open, setOpen] = useState(false);
	const formatted = useMemo(() => formatJsonForDisplay(value), [value]);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className="flex items-center justify-between gap-2 pr-3 sm:pr-4">
				<CollapsibleTrigger className="flex min-h-11 flex-1 items-center gap-2 px-4 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5">
					<ChevronDown
						className={cn("size-4 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-180")}
					/>
					{title}
				</CollapsibleTrigger>
				<CopyValueButton value={formatted} label={`Copiar ${title.toLowerCase()}`} />
			</div>
			<CollapsibleContent>
				{/* JSON e codigo: aqui a mono e legitima, ao contrario das tabelas de dados. */}
				<pre className="max-h-80 overflow-auto border-t border-border bg-secondary/40 px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all sm:px-5">
					{formatted}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

type FiscalDocumentProviderPayloadSectionProps = {
	payload: unknown;
	response: unknown;
	messages: string[];
};

/** O que foi ao provedor, o que voltou e as mensagens dele. Fechado por padrao: e material de suporte. */
export function FiscalDocumentProviderPayloadSection({ payload, response, messages }: FiscalDocumentProviderPayloadSectionProps) {
	return (
		<DetailsSection title="Payload e retorno">
			<div className="divide-y divide-border/70">
				{payload != null ? (
					<JsonPanel title="Payload enviado ao provedor" value={payload} />
				) : (
					<p className="px-4 py-3 text-xs text-muted-foreground sm:px-5">O payload aparece após a primeira tentativa de envio ao provedor fiscal.</p>
				)}
				{response != null ? <JsonPanel title="Retorno do provedor" value={response} /> : null}
			</div>
			{messages.length > 0 ? (
				<div className="border-t border-border px-4 py-3 sm:px-5">
					<p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Mensagens</p>
					<ul className="mt-2 flex flex-col gap-1.5">
						{messages.map((message, index) => (
							<li key={`${index}-${message.slice(0, 24)}`} className="rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-relaxed">
								{message}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</DetailsSection>
	);
}
