import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatEmptyStateProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	className?: string;
};

export function StatEmptyState({ icon: Icon, title, description, className }: StatEmptyStateProps) {
	return (
		<Empty className={cn("justify-center bg-muted/25 py-8", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Icon className="text-muted-foreground" strokeWidth={1.5} aria-hidden />
				</EmptyMedia>
				<EmptyTitle className="text-sm font-semibold tracking-tight">{title}</EmptyTitle>
				<EmptyDescription className="max-w-[280px] text-xs leading-relaxed">{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
