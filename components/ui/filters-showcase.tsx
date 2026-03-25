"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FiltersShowcaseRootProps = ComponentPropsWithoutRef<"div">;

function FiltersShowcaseRoot({ className, ...props }: FiltersShowcaseRootProps) {
	return <div className={cn("flex items-center justify-center gap-2 flex-wrap lg:justify-end", className)} {...props} />;
}

type FiltersShowcaseItemProps = {
	label: string;
	value: ReactNode;
	onRemove?: () => void;
	className?: string;
	labelClassName?: string;
	removeButtonLabel?: string;
};

function FiltersShowcaseItem({
	label,
	value,
	onRemove,
	className,
	labelClassName,
	removeButtonLabel,
}: FiltersShowcaseItemProps) {
	return (
		<div className={cn("flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[0.65rem]", className)}>
			<p className={cn("text-primary/80", labelClassName)}>
				{label}: <strong>{value}</strong>
			</p>
			{onRemove ? (
				<button
					type="button"
					onClick={onRemove}
					aria-label={removeButtonLabel || `Remover filtro ${label.toLowerCase()}`}
					className="rounded-lg bg-transparent p-1 text-primary hover:bg-primary/20"
				>
					<X size={12} />
				</button>
			) : null}
		</div>
	);
}

export const FiltersShowcase = {
	Root: FiltersShowcaseRoot,
	Item: FiltersShowcaseItem,
};
