import type React from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
	className?: string;
	icon: React.ReactNode;
	iconWrapperClassName?: string;
	label: string;
	value: string | number | React.ReactNode;
};

export function StatCard({ className, icon, iconWrapperClassName, label, value }: StatCardProps) {
	return (
		<div className={cn("bg-card border-border flex w-full flex-row items-center justify-between gap-1 rounded-xl border px-3 py-4 shadow-2xs", className)}>
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex items-center justify-start gap-2">
					<div className={cn("flex h-7 w-7 p-1 items-center justify-center rounded-full", iconWrapperClassName)}>{icon}</div>
					<h1 className="text-xs font-medium leading-none tracking-tight">{label}</h1>
				</div>
				{typeof value === "string" || typeof value === "number" ? <h1 className="text-sm font-medium">{value}</h1> : <div>{value}</div>}
			</div>
		</div>
	);
}
