"use client";

import { cn } from "@/lib/utils";

type StatusCountCardProps = {
	label: string;
	count: number;
	icon: React.ReactNode;
	className?: string;
};
export function StatusCountCard({ label, count, icon, className }: StatusCountCardProps) {
	return (
		<div className={cn("bg-card flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 shadow-2xs", className)}>
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-xs font-medium tracking-tight text-muted-foreground">{label}</span>
			</div>
			<span className="text-lg font-bold tabular-nums">{count}</span>
		</div>
	);
}
