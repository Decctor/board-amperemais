import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Hoisted para não realocar o array a cada render (evita reprocessamento no react-markdown).
const REMARK_PLUGINS = [remarkGfm];

type MarkdownViewerProps = {
	value: string;
	className?: string;
};

/**
 * Renderiza markdown como HTML estilizado pelos primitivos Typeset.
 * Isolado em módulo próprio para ser carregado sob demanda (next/dynamic) e reutilizado
 * tanto na pré-visualização do editor quanto em menus somente-leitura.
 */
export function MarkdownViewer({ value, className }: MarkdownViewerProps) {
	return (
		<div className={cn("typeset", className)}>
			<ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{value}</ReactMarkdown>
		</div>
	);
}
