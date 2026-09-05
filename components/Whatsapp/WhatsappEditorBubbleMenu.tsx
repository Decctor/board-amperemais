"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Strikethrough } from "lucide-react";
import type { ReactNode } from "react";

type EditorToolbarButtonProps = {
	tooltip: string;
	shortcut?: string;
	isActive: boolean;
	onClick: () => void;
	children: ReactNode;
};

export function EditorToolbarButton({ tooltip, shortcut, isActive, onClick, children }: EditorToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button type="button" size="sm" variant={isActive ? "default" : "ghost"} onClick={onClick}>
						{children}
					</Button>
				}
			/>
			<TooltipContent side="top">
				{tooltip}
				{shortcut ? <span className="text-background/70">— {shortcut}</span> : null}
			</TooltipContent>
		</Tooltip>
	);
}

type WhatsappEditorBubbleMenuProps = {
	editor: Editor;
};

export function WhatsappEditorBubbleMenu({ editor }: WhatsappEditorBubbleMenuProps) {
	return (
		<BubbleMenu
			editor={editor}
			updateDelay={100}
			options={{ placement: "top", offset: 8 }}
			shouldShow={({ editor: currentEditor, state }) => {
				if (!currentEditor.isEditable) return false;

				const { selection } = state;
				if (selection.empty) return false;

				// Só mostra quando há texto de fato selecionado (evita seleções de nós/whitespace).
				return state.doc.textBetween(selection.from, selection.to, " ").trim().length > 0;
			}}
			className="z-50"
		>
			<TooltipProvider delay={400}>
				<div className="border-border bg-popover flex items-center gap-0.5 rounded-lg border p-1 shadow-md">
					<EditorToolbarButton
						tooltip="Negrito"
						shortcut="Ctrl+B"
						isActive={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<Bold className="h-4 w-4" />
					</EditorToolbarButton>
					<EditorToolbarButton
						tooltip="Itálico"
						shortcut="Ctrl+I"
						isActive={editor.isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<Italic className="h-4 w-4" />
					</EditorToolbarButton>
					<EditorToolbarButton
						tooltip="Tachado"
						shortcut="Ctrl+Shift+S"
						isActive={editor.isActive("strike")}
						onClick={() => editor.chain().focus().toggleStrike().run()}
					>
						<Strikethrough className="h-4 w-4" />
					</EditorToolbarButton>
				</div>
			</TooltipProvider>
		</BubbleMenu>
	);
}
