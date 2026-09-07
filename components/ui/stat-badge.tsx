import type * as React from "react";

import { cn } from "@/lib/utils";

import { Chip, type chipVariants } from "./chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import type { VariantProps } from "class-variance-authority";

type StatBadgeProps = {
	icon: React.ReactNode;
	value: React.ReactNode;
	tooltipContent?: React.ReactNode;
	/** Tom do selo. Prefira uma variante a sobrescrever cor por `className`: a paleta é fechada. */
	variant?: VariantProps<typeof chipVariants>["variant"];
	className?: string;
	valueClassName?: string;
	tooltipClassName?: string;
	tooltipContentClassName?: string;
};

export function StatBadge({
	icon,
	value,
	tooltipContent,
	variant = "secondary",
	className,
	valueClassName,
	tooltipClassName,
	tooltipContentClassName,
}: StatBadgeProps) {
	const content = (
		<Chip.Root variant={variant} size="md" shape="xl" className={className}>
			<Chip.Icon>{icon}</Chip.Icon>
			<Chip.Label caps className={valueClassName}>
				{value}
			</Chip.Label>
		</Chip.Root>
	);

	if (!tooltipContent) {
		return content;
	}

	return (
		<Tooltip>
			<TooltipTrigger render={content} />
			<TooltipContent className={tooltipClassName}>
				<div className={cn(tooltipContentClassName)}>{tooltipContent}</div>
			</TooltipContent>
		</Tooltip>
	);
}
