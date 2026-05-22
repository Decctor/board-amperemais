"use client";

import { getMessageTemplateButtonPreset, MESSAGE_TEMPLATE_BUTTON_PRESET_OPTIONS } from "@/lib/message-templates/button-presets";
import type { TUseMessageTemplateState } from "@/state-hooks/use-message-template-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkIcon, Plus, Trash2 } from "lucide-react";

type TButton = TUseMessageTemplateState["state"]["messageTemplate"]["conteudo"]["botoes"][number];

export function MessageTemplateButtonsEditor({
	buttons,
	addContentButton,
	addContentPresetButton,
	updateContentButton,
	removeContentButton,
}: {
	buttons: TButton[];
	addContentButton: TUseMessageTemplateState["addContentButton"];
	addContentPresetButton: TUseMessageTemplateState["addContentPresetButton"];
	updateContentButton: TUseMessageTemplateState["updateContentButton"];
	removeContentButton: TUseMessageTemplateState["removeContentButton"];
}) {
	return (
		<div className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
			<div className="flex items-center justify-between gap-2">
				<p className="flex items-center gap-1.5 text-xs font-bold uppercase">
					<LinkIcon className="h-3.5 w-3.5" />
					Botões
				</p>
				<Button type="button" variant="ghost" size="xs" className="gap-1" onClick={addContentButton}>
					<Plus className="h-3.5 w-3.5" />
					MANUAL
				</Button>
			</div>
			<div className="flex flex-wrap gap-2">
				{MESSAGE_TEMPLATE_BUTTON_PRESET_OPTIONS.map((preset) => (
					<Button key={preset.id} type="button" variant="outline" size="xs" className="gap-1" onClick={() => addContentPresetButton(preset.id)}>
						<Plus className="h-3.5 w-3.5" />
						{preset.label}
					</Button>
				))}
			</div>
			{buttons.length > 0 ? (
				buttons.map((button, index) => (
					<MessageTemplateButtonEditor key={index} button={button} index={index} updateButton={updateContentButton} removeButton={removeContentButton} />
				))
			) : (
				<p className="text-muted-foreground text-xs">Nenhum botão configurado.</p>
			)}
		</div>
	);
}

function MessageTemplateButtonEditor({
	button,
	index,
	updateButton,
	removeButton,
}: {
	button: TButton;
	index: number;
	updateButton: (index: number, button: TButton) => void;
	removeButton: (index: number) => void;
}) {
	if (button.tipo === "URL_PRESET") {
		const preset = getMessageTemplateButtonPreset(button.preset);

		return (
			<div className="grid gap-2 rounded-lg bg-background p-2">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-xs font-bold uppercase">{preset?.label ?? button.preset}</p>
						<p className="text-muted-foreground text-xs">{preset?.description}</p>
					</div>
					<Button type="button" variant="ghost-destructive" size="icon-sm" onClick={() => removeButton(index)}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
				<Input value={button.texto} onChange={(event) => updateButton(index, { ...button, texto: event.target.value })} placeholder="Texto do botão" />
			</div>
		);
	}

	return (
		<div className="grid gap-2 rounded-lg bg-background p-2 md:grid-cols-[140px_1fr_1fr_auto]">
			<Select
				value={button.tipo}
				onValueChange={(value) => {
					if (value === "URL") updateButton(index, { tipo: "URL", texto: button.texto, url: "url" in button ? button.url : "https://" });
					if (value === "RESPOSTA RÁPIDA") updateButton(index, { tipo: "RESPOSTA RÁPIDA", texto: button.texto });
					if (value === "TELEFONE") updateButton(index, { tipo: "TELEFONE", texto: button.texto, telefone: "telefone" in button ? button.telefone : "" });
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="URL">URL</SelectItem>
					<SelectItem value="RESPOSTA RÁPIDA">RESPOSTA RÁPIDA</SelectItem>
					<SelectItem value="TELEFONE">TELEFONE</SelectItem>
				</SelectContent>
			</Select>
			<Input value={button.texto} onChange={(event) => updateButton(index, { ...button, texto: event.target.value } as TButton)} placeholder="Texto" />
			{"url" in button ? (
				<Input value={button.url} onChange={(event) => updateButton(index, { ...button, url: event.target.value })} placeholder="https://" />
			) : "telefone" in button ? (
				<Input value={button.telefone} onChange={(event) => updateButton(index, { ...button, telefone: event.target.value })} placeholder="+55..." />
			) : (
				<div />
			)}
			<Button type="button" variant="ghost-destructive" size="icon-sm" onClick={() => removeButton(index)}>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}
