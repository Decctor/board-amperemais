import type { ReactNode } from "react";

type SectionLabelProps = {
	icon: ReactNode;
	label: string;
};

/**
 * Section header used inside AIHint detail blocks.
 * Full-width, brand left-border accent with a gradient fade.
 */
export function SectionLabel({ icon, label }: SectionLabelProps) {
	return (
		<div className="flex items-center gap-2 bg-primary/20 px-2 py-1 rounded w-fit">
			<span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
			<h2 className="text-xs tracking-tight font-medium">{label}</h2>
		</div>
	);
}
