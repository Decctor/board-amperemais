import type * as React from "react";

import { cn } from "@/lib/utils";

import { Chip } from "./chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type StatBadgeProps = {
	icon: React.ReactNode;
	value: React.ReactNode;
	tooltipContent?: React.ReactNode;
	className?: string;
	valueClassName?: string;
	tooltipClassName?: string;
	tooltipContentClassName?: string;
};

export function StatBadge({ icon, value, tooltipContent, className, valueClassName, tooltipClassName, tooltipContentClassName }: StatBadgeProps) {
	const content = (
		<Chip.Root variant="secondary" size="md" shape="xl" className={className}>
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
