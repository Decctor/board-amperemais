"use client";

import { EditorToolbarButton } from "@/components/Whatsapp/WhatsappEditorBubbleMenu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Braces, Heading1, Heading2, Italic, List, ListOrdered, Quote, Strikethrough } from "lucide-react";
import { useEffect } from "react";

type MarkdownEditorProps = {
	value: string;
	onChange: (markdown: string) => void;
	placeholder?: string;
	editable?: boolean;
};

// Instâncias de extensão são definições sem estado (o estado vive no editor) — criadas uma vez no módulo
// para não realocar o array a cada render.
const EDITOR_EXTENSIONS = [
	StarterKit,
	TableKit,
	TaskList,
	TaskItem.configure({ nested: true }),
	Markdown.configure({
		markedOptions: { gfm: true, breaks: false },
		indentation: { style: "space", size: 2 },
	}),
];

export function MarkdownEditor({ value, onChange, placeholder = "Escreva o conteúdo...", editable = true }: MarkdownEditorProps) {
	const editor = useEditor({
		extensions: EDITOR_EXTENSIONS,
		content: value,
		contentType: "markdown",
		editable,
		immediatelyRender: false,
		onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getMarkdown()),
		editorProps: {
			attributes: {
				class: "typeset min-h-56 max-w-none px-4 py-3 outline-none",
				"aria-label": "Editor de Markdown",
			},
		},
	});

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(editable);
	}, [editable, editor]);

	useEffect(() => {
		if (!editor || value === editor.getMarkdown()) return;
		editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
	}, [editor, value]);

	if (!editor) return <div className="border-border bg-muted/20 min-h-56 animate-pulse rounded-lg border" aria-hidden="true" />;

	return (
		<div className="border-border bg-background overflow-hidden rounded-lg border shadow-xs">
			{editable ? (
				<TooltipProvider delayDuration={400}>
					<div className="border-border bg-muted/30 flex flex-wrap items-center gap-1 border-b p-2">
						<EditorToolbarButton tooltip="Negrito" shortcut="Ctrl+B" isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
							<Bold className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Itálico" shortcut="Ctrl+I" isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
							<Italic className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Tachado" isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
							<Strikethrough className="size-4" />
						</EditorToolbarButton>
						<div className="bg-border mx-1 h-6 w-px" />
						<EditorToolbarButton tooltip="Título principal" isActive={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
							<Heading1 className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Subtítulo" isActive={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
							<Heading2 className="size-4" />
						</EditorToolbarButton>
						<div className="bg-border mx-1 h-6 w-px" />
						<EditorToolbarButton tooltip="Lista com marcadores" isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
							<List className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Lista numerada" isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
							<ListOrdered className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Citação" isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
							<Quote className="size-4" />
						</EditorToolbarButton>
						<EditorToolbarButton tooltip="Bloco de código" isActive={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
							<Braces className="size-4" />
						</EditorToolbarButton>
					</div>
				</TooltipProvider>
			) : null}
			<div className="relative">
				{editor.isEmpty ? <span className="text-muted-foreground pointer-events-none absolute top-3 left-4 text-sm italic">{placeholder}</span> : null}
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}
