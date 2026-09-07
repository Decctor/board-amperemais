"use client";

import { CodeBlock } from "@/components/ui/code-block";
import { Section } from "@/components/ui/section";
import { formatJsonForDisplay } from "@/lib/formatting";
import { Braces } from "lucide-react";

function JsonPanel({ title, value }: { title: string; value: unknown }) {
	return (
		<CodeBlock.Root value={formatJsonForDisplay(value)}>
			<CodeBlock.Header className="pr-3">
				<CodeBlock.Trigger className="px-3">{title}</CodeBlock.Trigger>
				<CodeBlock.Copy label={`Copiar ${title.toLowerCase()}`} />
			</CodeBlock.Header>
			<CodeBlock.Content className="border-t border-border px-3 sm:px-3" />
		</CodeBlock.Root>
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
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Braces />
				</Section.Icon>
				<Section.Title>Payload e retorno</Section.Title>
			</Section.Header>
			<Section.Bleed>
				<div className="divide-y divide-border/70">
					{payload != null ? (
						<JsonPanel title="Payload enviado ao provedor" value={payload} />
					) : (
						<p className="px-3 py-3 text-xs text-muted-foreground">O payload aparece após a primeira tentativa de envio ao provedor fiscal.</p>
					)}
					{response != null ? <JsonPanel title="Retorno do provedor" value={response} /> : null}
				</div>
				{messages.length > 0 ? (
					<div className="border-t border-border px-3 py-3">
						<p className="text-label text-muted-foreground">Mensagens</p>
						<ul className="mt-2 flex flex-col gap-1.5">
							{messages.map((message, index) => (
								<li key={`${index}-${message.slice(0, 24)}`} className="rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-relaxed">
									{message}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</Section.Bleed>
		</Section.Root>
	);
}
