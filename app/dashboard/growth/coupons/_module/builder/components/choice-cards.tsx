"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { ComponentType } from "react";

export type TChoiceOption<T extends string> = {
	value: T;
	label: string;
	description: string;
	icon?: ComponentType<{ className?: string }>;
};

type ChoiceCardsProps<T extends string> = {
	label?: string;
	value: T;
	options: TChoiceOption<T>[];
	onChange: (value: T) => void;
};

/** Two-or-three-way plain-language choice, replacing an abstract dropdown. */
export default function ChoiceCards<T extends string>({ label, value, options, onChange }: ChoiceCardsProps<T>) {
	return (
		<div className="flex w-full flex-col gap-2">
			{label ? <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span> : null}
			<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
				{options.map((option) => {
					const Icon = option.icon;
					const selected = option.value === value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							aria-pressed={selected}
							className={cn(
								"flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
								selected ? "border-primary bg-primary/[0.06] shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
							)}
						>
							<span
								className={cn(
									"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
									selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
								)}
							>
								{Icon ? <Icon className="h-3.5 w-3.5" /> : selected ? <Check className="h-3.5 w-3.5" /> : null}
							</span>
							<div className="flex min-w-0 flex-col gap-0.5">
								<h4 className="text-sm font-semibold tracking-tight text-foreground">{option.label}</h4>
								<p className="text-xs leading-snug text-muted-foreground">{option.description}</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
