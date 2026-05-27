"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageTemplateNativeVariables, getDefaultMessageTemplateVariableExample } from "@/lib/message-templates";
import { MessageTemplateVariables } from "@/lib/message-templates";
import type { TMessageTemplateContent } from "@/schemas/message-templates";
import Mention from "@tiptap/extension-mention";
import { type JSONContent, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Braces, ChevronDown, Italic, List, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSuggestion } from "@/components/MessageTemplates/suggestion";

type MessageTemplateBodyEditorProps = {
	content: string;
	onContentChange: (content: string) => void;
	parametros: TMessageTemplateContent["corpo"]["parametros"];
	onParametrosChange: (parametros: TMessageTemplateContent["corpo"]["parametros"]) => void;
};

function extractMentionIds(node: JSONContent): string[] {
	const ids: string[] = [];

	function visit(currentNode: JSONContent) {
		if (currentNode.type === "mention" && typeof currentNode.attrs?.id === "string") {
			ids.push(currentNode.attrs.id);
		}
		currentNode.content?.forEach(visit);
	}

	visit(node);
	return ids;
}

function extractTemplateVariableIdsFromText(text: string) {
	return Array.from(text.matchAll(/\{\{\s*([^}]+)\s*\}\}/g)).flatMap((match) => {
		const token = match[1]?.trim();
		if (!token) return [];

		const variable =
			MessageTemplateNativeVariables.find((item) => item.identificador.toLowerCase() === token.toLowerCase()) ??
			MessageTemplateNativeVariables.find((item) => item.label.toLowerCase() === token.toLowerCase());

		return variable ? [variable.identificador] : [];
	});
}

function escapeHtml(text: string) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function normalizeContentForEditor(content: string) {
	if (/<[a-z][\s\S]*>/i.test(content)) return content;

	return `<p>${escapeHtml(content)
		.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, identifier: string) => {
			const variable = MessageTemplateNativeVariables.find((item) => item.identificador === identifier);
			if (!variable) return `{{${identifier}}}`;

			return `<span data-type="mention" class="mention" data-id="${identifier}" data-label="${identifier}" data-mention-suggestion-char="{">{{${variable.label.toUpperCase()}}}</span>`;
		})
		.replace(/\r?\n/g, "<br>")}</p>`;
}

function buildBodyParameters({
	mentionIds,
	currentParameters,
}: {
	mentionIds: string[];
	currentParameters: TMessageTemplateContent["corpo"]["parametros"];
}) {
	const seenIds = new Set<string>();
	const nextParameters: TMessageTemplateContent["corpo"]["parametros"] = [];

	for (const identifier of mentionIds) {
		if (seenIds.has(identifier)) continue;
		seenIds.add(identifier);

		const variable = MessageTemplateNativeVariables.find((item) => item.identificador === identifier);
		if (!variable) continue;

		const currentParameter = currentParameters.find((item) => item.identificadorInterno === identifier);
		nextParameters.push({
			identificadorInterno: identifier,
			identificadorExterno: currentParameter?.identificadorExterno ?? String(nextParameters.length + 1),
			exemplo: currentParameter?.exemplo ?? getDefaultMessageTemplateVariableExample(identifier),
		});
	}

	return nextParameters;
}

export function MessageTemplateBodyEditor({ content, onContentChange, parametros, onParametrosChange }: MessageTemplateBodyEditorProps) {
	const [charCount, setCharCount] = useState(0);
	const parametrosRef = useRef(parametros);
	const onParametrosChangeRef = useRef(onParametrosChange);
	const suggestionConfig = useMemo(() => createSuggestion(MessageTemplateVariables), []);
	const editorContent = useMemo(() => normalizeContentForEditor(content), [content]);

	useEffect(() => {
		parametrosRef.current = parametros;
		onParametrosChangeRef.current = onParametrosChange;
	}, [onParametrosChange, parametros]);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Mention.configure({
				HTMLAttributes: {
					class: "mention",
				},
				suggestion: {
					...suggestionConfig,
					char: "{",
				},
				renderLabel({ node }) {
					const variable =
						MessageTemplateNativeVariables.find((item) => item.identificador === node.attrs.id) ??
						MessageTemplateNativeVariables.find((item) => item.label === node.attrs.label);

					return `{{${(variable?.label ?? node.attrs.id).toUpperCase()}}}`;
				},
			}),
		],
		content: editorContent,
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			onContentChange(editor.getHTML());
			setCharCount(editor.getText().length);

			const nextParameters = buildBodyParameters({
				mentionIds: [...extractMentionIds(editor.getJSON()), ...extractTemplateVariableIdsFromText(editor.getText())],
				currentParameters: parametrosRef.current,
			});

			if (JSON.stringify(nextParameters) !== JSON.stringify(parametrosRef.current)) {
				onParametrosChangeRef.current(nextParameters);
			}
		},
	});

	useEffect(() => {
		if (!editor) return;
		setCharCount(editor.getText().length);
	}, [editor]);

	useEffect(() => {
		if (editor && editorContent !== editor.getHTML()) {
			editor.commands.setContent(editorContent);
		}
	}, [editorContent, editor]);

	function insertVariable(identifier: string) {
		if (!editor) return;

		editor
			.chain()
			.focus()
			.insertContent([
				{
					type: "mention",
					attrs: {
						id: identifier,
					},
				},
				{ type: "text", text: " " },
			])
			.run();
	}

	if (!editor) return null;

	const maxChars = 1024;
	const isOverLimit = charCount > maxChars;

	return (
		<div className="border-border overflow-hidden rounded-xl border bg-background">
			<div className="border-border flex flex-wrap items-center gap-2 border-b p-2">
				<Button type="button" size="sm" variant={editor.isActive("bold") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()}>
					<strong>B</strong>
				</Button>
				<Button type="button" size="sm" variant={editor.isActive("italic") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()}>
					<Italic className="h-4 w-4" />
				</Button>
				<Button type="button" size="sm" variant={editor.isActive("bulletList") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()}>
					<List className="h-4 w-4" />
				</Button>
				<Button type="button" size="sm" variant={editor.isActive("orderedList") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
					<ListOrdered className="h-4 w-4" />
				</Button>

				<div className="bg-border h-6 w-px" />

				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button type="button" size="sm" variant="secondary" className="gap-1.5">
							<Braces className="h-3.5 w-3.5" />
							<span>+ VARIÁVEL</span>
							<ChevronDown className="h-3.5 w-3.5 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" sideOffset={8} className="z-110 w-[320px] overflow-hidden p-0">
						<div className="border-b bg-muted/40 px-3 py-2.5">
							<span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Variáveis do template</span>
						</div>
						<div className="max-h-[300px] overflow-y-auto p-1 [scrollbar-width:thin]">
							{MessageTemplateNativeVariables.map((variable) => (
								<DropdownMenuItem key={variable.identificador} onSelect={() => insertVariable(variable.identificador)} className="items-start rounded-md px-2 py-2">
									<div className="flex min-w-0 flex-col">
										<span className="truncate font-medium">{variable.label}</span>
										<span className="text-muted-foreground truncate text-xs">{`{{${variable.identificador}}}`}</span>
									</div>
								</DropdownMenuItem>
							))}
						</div>
						<DropdownMenuSeparator className="my-0" />
						<div className="text-muted-foreground px-3 py-2 text-[11px]">
							Dica: digite <span className="font-mono">{"{"}</span> no editor para abrir sugestões rápidas.
						</div>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className={`ml-auto text-sm font-medium ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}>
					{charCount} / {maxChars}
				</span>
			</div>

			<EditorContent editor={editor} className="prose max-w-none p-4 text-sm leading-6 [&_.ProseMirror]:min-h-56 [&_.ProseMirror]:outline-none" />

			<style jsx global>{`
				.mention {
					background-color: rgba(0, 0, 0, 0.08);
					border-radius: 0.25rem;
					font-weight: 700;
					padding: 0.1rem 0.3rem;
					box-decoration-break: clone;
				}
			`}</style>
		</div>
	);
}
