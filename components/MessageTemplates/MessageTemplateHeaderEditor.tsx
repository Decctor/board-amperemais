"use client";

import { MessageTemplateDynamicHeaderPresetOptions, type TTemplateDynamicHeaderPreset } from "@/app/dashboard/communication/_components/template-draft-store";
import TemplateMediaUpload from "@/components/MessageTemplates/TemplateMediaUpload";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TUseMessageTemplateState } from "@/state-hooks/use-message-template-state";
import { ImageIcon } from "lucide-react";
import { MessageTemplateField } from "./MessageTemplateFields";

type THeader = TUseMessageTemplateState["state"]["messageTemplate"]["conteudo"]["cabecalho"];
type THeaderType = Exclude<THeader, null | undefined>["tipo"];

export const messageTemplateHeaderTypeOptions: Array<{ id: THeaderType; label: string }> = [
	{ id: "NENHUM", label: "Nenhum" },
	{ id: "TEXTO", label: "Texto" },
	{ id: "IMAGEM", label: "Imagem" },
	{ id: "VIDEO", label: "Vídeo" },
	{ id: "DOCUMENTO", label: "Documento" },
	{ id: "IMAGEM_DINAMICA", label: "Imagem dinâmica" },
];

export function MessageTemplateHeaderTypeSelect({
	header,
	updateTemplateContentHeader,
}: {
	header: THeader;
	updateTemplateContentHeader: TUseMessageTemplateState["updateTemplateContentHeader"];
}) {
	return (
		<MessageTemplateField label="Cabeçalho">
			<Select
				value={header?.tipo || "NENHUM"}
				onValueChange={(value) =>
					updateTemplateContentHeader({
						tipo: value as THeaderType,
						conteudoMidiaUrl: value === "IMAGEM_DINAMICA" ? "" : header?.conteudoMidiaUrl || "",
						imagemDinamicaPreset: header?.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE",
					})
				}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{messageTemplateHeaderTypeOptions.map((type) => (
						<SelectItem key={type.id} value={type.id}>
							{type.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</MessageTemplateField>
	);
}

export function MessageTemplateHeaderEditor({
	organizationId,
	header,
	updateTemplateContentHeader,
}: {
	organizationId: string;
	header: THeader;
	updateTemplateContentHeader: TUseMessageTemplateState["updateTemplateContentHeader"];
}) {
	if (!header || header.tipo === "NENHUM") return null;

	if (header.tipo === "TEXTO") {
		return (
			<MessageTemplateField label="Texto do cabeçalho">
				<Input value={header.conteudoTexto || ""} onChange={(event) => updateTemplateContentHeader({ conteudoTexto: event.target.value })} />
			</MessageTemplateField>
		);
	}

	if (header.tipo === "IMAGEM_DINAMICA") {
		return (
			<DynamicHeaderPresetPicker
				presetId={header.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE"}
				onChange={(presetId) => updateTemplateContentHeader({ imagemDinamicaPreset: presetId })}
			/>
		);
	}

	if (header.tipo === "LOCALIZAÇÃO") return <div>LOCALIZAÇÃO</div>;

	return (
		<HeaderMediaUpload
			headerType={header.tipo}
			currentUrl={header.conteudoMidiaUrl || ""}
			organizationId={organizationId}
			onUploaded={(url) => updateTemplateContentHeader({ conteudoMidiaUrl: url, conteudoMidiaHandle: null })}
			onRemoved={() => updateTemplateContentHeader({ conteudoMidiaUrl: "", conteudoMidiaHandle: null })}
		/>
	);
}

function HeaderMediaUpload({
	headerType,
	currentUrl,
	organizationId,
	onUploaded,
	onRemoved,
}: {
	headerType: "IMAGEM" | "VIDEO" | "DOCUMENTO";
	currentUrl: string;
	organizationId: string;
	onUploaded: (url: string) => void;
	onRemoved: () => void;
}) {
	const mappedType = headerType === "IMAGEM" ? "image" : headerType === "VIDEO" ? "video" : "document";

	return (
		<div className="sm:col-span-2">
			<TemplateMediaUpload
				headerType={mappedType}
				currentUrl={currentUrl || null}
				onMediaUploaded={onUploaded}
				onMediaRemoved={onRemoved}
				organizationId={organizationId}
			/>
		</div>
	);
}

function DynamicHeaderPresetPicker({ presetId, onChange }: { presetId: TTemplateDynamicHeaderPreset; onChange: (presetId: TTemplateDynamicHeaderPreset) => void }) {
	const selectedPreset = MessageTemplateDynamicHeaderPresetOptions.find((preset) => preset.id === presetId) ?? MessageTemplateDynamicHeaderPresetOptions[0];

	return (
		<div className="sm:col-span-2">
			<div className="flex flex-col gap-3">
				<MessageTemplateField label="Preset da imagem">
					<Select value={presetId} onValueChange={(value) => onChange(value as TTemplateDynamicHeaderPreset)}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MessageTemplateDynamicHeaderPresetOptions.map((preset) => (
								<SelectItem key={preset.id} value={preset.id}>
									{preset.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</MessageTemplateField>
				<div className="flex gap-2 rounded-lg bg-background p-3 text-xs leading-5 text-muted-foreground">
					<ImageIcon className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{selectedPreset?.description}</p>
				</div>
			</div>
		</div>
	);
}
