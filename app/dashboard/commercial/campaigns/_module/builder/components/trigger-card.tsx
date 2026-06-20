"use client";

import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

export type TriggerCardProps = {
	icon: ComponentType<{ className?: string }>;
	label: string;
	description: string;
	selected?: boolean;
	onClick: () => void;
};
export default function TriggerCard({ icon: Icon, label, description, selected, onClick }: TriggerCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group flex w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-all duration-200",
				"hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm",
				selected ? "border-brand shadow-sm ring-2 ring-brand/30" : "border-brand/10",
			)}
			aria-pressed={selected}
		>
			<div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand", selected && "bg-brand text-brand-foreground")}>
				<Icon className="h-4 w-4" />
			</div>
			<h4 className="text-sm font-semibold tracking-tight">{label}</h4>
			<p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
		</button>
	);
}
