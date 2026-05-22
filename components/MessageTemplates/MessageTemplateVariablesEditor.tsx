"use client";

import { Input } from "@/components/ui/input";
import type { TUseMessageTemplateState } from "@/state-hooks/use-message-template-state";
import { Braces } from "lucide-react";

type TParameter = TUseMessageTemplateState["state"]["messageTemplate"]["conteudo"]["corpo"]["parametros"][number];

export function MessageTemplateVariablesEditor({
	parametros,
	unknownVariables,
	updateTemplateContentBodyParameter,
}: {
	parametros: TParameter[];
	unknownVariables: string[];
	updateTemplateContentBodyParameter: TUseMessageTemplateState["updateTemplateContentBodyParameter"];
}) {
	return (
		<div className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
			<p className="flex items-center gap-1.5 text-xs font-bold uppercase">
				<Braces className="h-3.5 w-3.5" />
				Variáveis detectadas
			</p>
			{parametros.length > 0 ? (
				<div className="flex flex-col gap-2">
					{parametros.map((parametro, index) => (
						<div key={parametro.identificadorInterno} className="grid gap-2 rounded-lg bg-background p-2 md:grid-cols-[1fr_1fr]">
							<div className="border-border bg-muted/30 flex min-h-9 items-center rounded-4xl border px-3 font-mono text-sm">
								{`{{${parametro.identificadorInterno}}}`}
							</div>
							<Input value={parametro.exemplo} onChange={(event) => updateTemplateContentBodyParameter(index, { exemplo: event.target.value })} placeholder="Exemplo" />
						</div>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">Use variáveis como {"{{clientName}}"} no conteúdo.</p>
			)}
			{unknownVariables.length > 0 ? (
				<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-700">
					Variáveis não permitidas: {unknownVariables.map((variable) => `{{${variable}}}`).join(", ")}.
				</div>
			) : null}
		</div>
	);
}
