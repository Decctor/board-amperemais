"use client";

import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

type BenefitCardProps = {
	icon: ComponentType<{ className?: string }>;
	label: string;
	tagline: string;
	description: string;
	example: string;
	selected: boolean;
	onClick: () => void;
};

export default function BenefitCard({ icon: Icon, label, tagline, description, example, selected, onClick }: BenefitCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={cn(
				"group flex h-full flex-col gap-2 rounded-xl border p-4 text-left transition-all",
				selected ? "border-primary bg-primary/[0.06] shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
			)}
		>
			<span
				className={cn(
					"flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
					selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/15",
				)}
			>
				<Icon className="h-5 w-5" />
			</span>
			<div className="flex flex-col gap-0.5">
				<h3 className="text-sm font-semibold tracking-tight text-foreground">{label}</h3>
				<p className="text-xs font-medium text-muted-foreground">{tagline}</p>
			</div>
			<p className="text-xs leading-snug text-muted-foreground">{description}</p>
			<p className="mt-auto text-[11px] font-medium text-primary/80">{example}</p>
		</button>
	);
}
