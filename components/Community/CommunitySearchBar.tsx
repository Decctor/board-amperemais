"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type CommunitySearchBarProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	title?: string;
	description?: string;
	size?: "default" | "large";
};

export function CommunitySearchBar({
	value,
	onChange,
	placeholder = "Buscar cursos, materiais, guias...",
	title = "O que você precisa resolver agora?",
	description = "Encontre vídeos, documentos e guias para aplicar na sua operação.",
	size = "large",
}: CommunitySearchBarProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<h1 className={size === "large" ? "text-2xl font-extrabold tracking-tight sm:text-3xl" : "text-xl font-extrabold tracking-tight"}>
					{title}
				</h1>
				{description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p> : null}
			</div>
			<div className="relative w-full max-w-2xl">
				<Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
				<Input
					type="search"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="h-12 rounded-xl border-border bg-card pl-11 text-base shadow-sm focus-visible:ring-primary/15 sm:h-14"
					aria-label="Buscar conteúdo da comunidade"
				/>
			</div>
		</section>
	);
}
