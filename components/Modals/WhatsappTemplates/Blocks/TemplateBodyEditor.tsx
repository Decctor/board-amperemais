import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import type { TWhatsappTemplateBodyParameter } from "@/schemas/whatsapp-templates";
import Mention from "@tiptap/extension-mention";
import { type Editor, EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FileText, List, ListOrdered } from "lucide-react";
import { useEffect, useState } from "react";
import suggestion from "./suggestion";

type TemplateBodyEditorProps = {
	content: string;
	contentChangeCallback: (content: string) => void;
	parametrosTipo: "NOMEADO" | "POSICIONAL";
	parametros: TWhatsappTemplateBodyParameter[];
	onParametrosChange: (parametros: TWhatsappTemplateBodyParameter[]) => void;
};

function TemplateBodyEditor({ content, contentChangeCallback, parametrosTipo, parametros, onParametrosChange }: TemplateBodyEditorProps) {
	const [charCount, setCharCount] = useState(0);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Mention.configure({
				HTMLAttributes: {
					class: "mention",
				},
				suggestion: {
					...suggestion,
					char: "{",
				},
				renderLabel({ node }) {
					return `{{${node.attrs.id}}}`;
				},
			}),
		],
		content: content,
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			const text = editor.getText();
			contentChangeCallback(html);
			setCharCount(text.length);

			// Extract variables from content
			extractVariablesFromContent(editor);
		},
	});

	// Extract variables from HTML content
	const extractVariablesFromContent = (editor: Editor) => {
		const foundVariables = new Set<string>();

		// 1. Traverse JSON to find Mention nodes
		const traverse = (node: JSONContent) => {
			if (node.type === "mention" && node.attrs?.id) {
				foundVariables.add(node.attrs.id);
			}
			if (node.content) {
				node.content.forEach(traverse);
			}
		};
		traverse(editor.getJSON());

		// 2. Regex on text content for positional or plain text variables
		const text = editor.getText();
		const variableRegex = /\{\{(\d+|[a-z_]+)\}\}/g;
		const matches = text.matchAll(variableRegex);
		for (const match of matches) {
			foundVariables.add(match[1]);
		}

		// Update parameters based on found variables
		const newParametros: TWhatsappTemplateBodyParameter[] = [];
		for (const varName of foundVariables) {
			const existing = parametros.find((p) => p.nome === varName);
			if (existing) {
				newParametros.push(existing);
			} else {
				newParametros.push({
					nome: varName,
					exemplo: "",
				});
			}
		}

		// Only update if there are changes
		if (JSON.stringify(newParametros) !== JSON.stringify(parametros)) {
			onParametrosChange(newParametros);
		}
	};

	useEffect(() => {
		if (editor && content !== editor.getHTML()) {
			editor.commands.setContent(content);
		}
	}, [content, editor]);

	const insertPositionalVariable = () => {
		if (!editor) return;
		// Find next positional number
		const existingNumbers = parametros
			.map((p) => Number.parseInt(p.nome))
			.filter((n) => !Number.isNaN(n))
			.sort((a, b) => a - b);
		const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
		const variableName = nextNumber.toString();
		editor.chain().focus().insertContent(`{{${variableName}}}`).run();
	};

	const insertNamedVariable = (variableValue: string) => {
		if (!editor) return;
		editor
			.chain()
			.focus()
			.insertContent({
				type: "mention",
				attrs: { id: variableValue, label: variableValue },
			})
			.insertContent(" ")
			.run();
	};

	if (!editor) return null;

	const maxChars = 1024;
	const isOverLimit = charCount > maxChars;
	console.log({
		content: content,
		parametros: parametros,
	});
	return (
		<ResponsiveMenuSection title="CORPO DA MENSAGEM" icon={<FileText size={15} />}>
			<div className="flex items-center flex-wrap gap-2 border-b border-primary/10 p-3">
				<div className="flex gap-1">
					<Button
						type="button"
						size="sm"
						variant={editor.isActive("bold") ? "default" : "ghost"}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<strong>B</strong>
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => editor.chain().focus().toggleItalic().run()}
						variant={editor.isActive("italic") ? "default" : "ghost"}
					>
						<em>I</em>
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => editor.chain().focus().toggleStrike().run()}
						variant={editor.isActive("strike") ? "default" : "ghost"}
					>
						<s>S</s>
					</Button>
				</div>

				<div className="h-6 w-px bg-gray-300" />

				<div className="flex gap-1">
					<Button
						type="button"
						size="sm"
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						variant={editor.isActive("bulletList") ? "default" : "ghost"}
					>
						<List className="w-4 h-4 min-w-4 min-h-4" />
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						variant={editor.isActive("orderedList") ? "default" : "ghost"}
					>
						<ListOrdered className="w-4 h-4 min-w-4 min-h-4" />
					</Button>
				</div>

				<div className="h-6 w-px bg-gray-300" />

				{parametrosTipo === "POSICIONAL" ? (
					<Button type="button" size="sm" variant="secondary" onClick={insertPositionalVariable}>
						+ VARIÁVEL
					</Button>
				) : (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" size="sm" variant="secondary">
								+ VARIÁVEL
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
							{WhatsappTemplateVariables.map((variable) => (
								<DropdownMenuItem key={variable.id} onClick={() => insertNamedVariable(variable.value)}>
									<div className="flex flex-col">
										<span className="font-medium">{variable.label}</span>
										<span className="text-xs text-muted-foreground">{`{{${variable.value}}}`}</span>
									</div>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				<div className="ml-auto flex items-center gap-2">
					<span className={`text-sm font-medium ${isOverLimit ? "text-red-500" : "text-primary/60"}`}>
						{charCount} / {maxChars}
					</span>
				</div>
			</div>

			<EditorContent editor={editor} className="prose max-w-none p-6 min-h-[200px]" suppressHydrationWarning />

			{parametros.length > 0 && (
				<div className="border-t border-primary/10 p-3 space-y-2">
					<h4 className="text-sm font-semibold">Exemplos de Variáveis</h4>
					{parametros.map((param, index) => (
						<div key={index.toString()} className="flex items-center gap-2">
							<span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{`{{${param.nome}}}`}</span>
							<input
								type="text"
								value={param.exemplo}
								onChange={(e) => {
									const newParametros = [...parametros];
									newParametros[index] = { ...param, exemplo: e.target.value };
									onParametrosChange(newParametros);
								}}
								placeholder="Valor de exemplo"
								className="flex-1 px-2 py-1 text-sm border rounded"
							/>
						</div>
					))}
				</div>
			)}

			<style jsx global>{`
				.ProseMirror {
					min-height: 200px;
					outline: none;
				}

				.ProseMirror p {
					margin: 0.5rem 0;
				}

				.ProseMirror ul,
				.ProseMirror ol {
					padding-left: 2rem;
				}
				
				.mention {
					background-color: rgba(0, 0, 0, 0.1);
					border-radius: 0.2rem;
					padding: 0.1rem 0.3rem;
					box-decoration-break: clone;
				}
				
				/* Dark mode */
				@media (prefers-color-scheme: dark) {
					.mention {
						background-color: rgba(255, 255, 255, 0.1);
					}
				}
			`}</style>
		</ResponsiveMenuSection>
	);
}

export default TemplateBodyEditor;
