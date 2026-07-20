"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, PencilLine } from "lucide-react";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownViewer } from "./MarkdownViewer";

type MarkdownFieldProps = {
	label: string;
	value: string;
	handleChange: (value: string) => void;
	placeholder?: string;
	editable?: boolean;
	required?: boolean;
};

export function MarkdownField({ label, value, handleChange, placeholder, editable = true, required = false }: MarkdownFieldProps) {
	return (
		<Field className="gap-2" data-disabled={!editable}>
			<FieldLabel className="text-foreground/80 text-start text-sm font-medium tracking-tight">
				{label}
				{required ? <span className="text-red-500">*</span> : null}
			</FieldLabel>
			<Tabs defaultValue={editable ? "editor" : "preview"}>
				<TabsList aria-label={`Modos de ${label.toLowerCase()}`}>
					<TabsTrigger value="editor" disabled={!editable}>
						<PencilLine data-icon="inline-start" /> Editor
					</TabsTrigger>
					<TabsTrigger value="preview">
						<Eye data-icon="inline-start" /> Visualização
					</TabsTrigger>
				</TabsList>
				<TabsContent value="editor">
					<MarkdownEditor value={value} onChange={handleChange} placeholder={placeholder} editable={editable} />
				</TabsContent>
				<TabsContent value="preview">
					<div className="border-border bg-background min-h-56 rounded-lg border px-4 py-3 shadow-xs">
						{value.trim() ? (
							<MarkdownViewer value={value} />
						) : (
							<p className="text-muted-foreground text-sm italic">Nada para pré-visualizar ainda.</p>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</Field>
	);
}
