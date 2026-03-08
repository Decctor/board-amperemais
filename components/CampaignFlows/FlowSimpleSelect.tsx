"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FlowSimpleSelectProps = {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
};

export function FlowSimpleSelect({ label, value, options, onChange }: FlowSimpleSelectProps) {
	return (
		<div className="flex w-full flex-col gap-1">
			<Label className="text-primary/80 text-start text-xs font-medium tracking-tight">{label}</Label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(
					"border-primary/20 focus:border-primary w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-hidden duration-500 ease-in-out",
				)}
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}
