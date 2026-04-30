"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

export type CategoryCardProps = {
	id: string;
	icon: ComponentType<{ className?: string }>;
	label: string;
	tagline: string;
	description: string;
	triggerCount: number;
	selected?: boolean;
	onClick: () => void;
};
export default function CategoryCard({ icon: Icon, label, tagline, description, triggerCount, selected, onClick }: CategoryCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all duration-300",
				"hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
				selected ? "border-brand shadow-md ring-2 ring-brand/30" : "border-brand/10",
			)}
			aria-pressed={selected}
		>
			<div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
			<div className="flex w-full items-start justify-between gap-2">
				<div
					className={cn(
						"flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors",
						selected && "bg-brand text-brand-foreground",
					)}
				>
					<Icon className="h-5 w-5" />
				</div>
				<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
					{triggerCount} {triggerCount === 1 ? "gatilho" : "gatilhos"}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<h3 className="text-base font-semibold tracking-tight">{label}</h3>
				<p className="text-xs font-medium uppercase tracking-wide text-primary/60">{tagline}</p>
				<p className="text-xs text-muted-foreground line-clamp-3">{description}</p>
			</div>
			<div className="mt-auto flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary/70 transition-colors group-hover:text-primary">
				Selecionar
				<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
			</div>
		</button>
	);
}
