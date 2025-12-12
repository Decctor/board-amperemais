import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TWhatsappTemplateBodyParameter } from "@/schemas/whatsapp-templates";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FileText, List, ListOrdered } from "lucide-react";
import { useEffect, useState } from "react";

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
		extensions: [StarterKit],
		content: content,
		immediatelyRender: false,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			const text = editor.getText();
			contentChangeCallback(html);
			setCharCount(text.length);

			// Extract variables from content
			extractVariablesFromContent(html);
		},
	});

	// Extract variables from HTML content
	const extractVariablesFromContent = (html: string) => {
		const variableRegex = /\{\{(\d+|[a-z_]+)\}\}/g;
		const matches = html.matchAll(variableRegex);
		const foundVariables = new Set<string>();

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

	const insertVariable = () => {
		if (!editor) return;

		let variableName: string;
		if (parametrosTipo === "POSICIONAL") {
			// Find next positional number
			const existingNumbers = parametros
				.map((p) => Number.parseInt(p.nome))
				.filter((n) => !Number.isNaN(n))
				.sort((a, b) => a - b);
			const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
			variableName = nextNumber.toString();
		} else {
			// Named variable - let user type
			const name = prompt("Nome da variável (apenas letras minúsculas e underscores):");
			if (!name || !/^[a-z_]+$/.test(name)) {
				alert("Nome inválido. Use apenas letras minúsculas e underscores.");
				return;
			}
			variableName = name;
		}

		editor.chain().focus().insertContent(`{{${variableName}}}`).run();
	};

	if (!editor) return null;

	const maxChars = 1024;
	const isOverLimit = charCount > maxChars;

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

				<Button type="button" size="sm" variant="secondary" onClick={insertVariable}>
					+ VARIÁVEL
				</Button>

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
			`}</style>
		</ResponsiveMenuSection>
	);
}

export default TemplateBodyEditor;
