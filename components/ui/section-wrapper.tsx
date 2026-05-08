import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

type SectionWrapperProps = PropsWithChildren<{
	title: string;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	wrapperClassName?: string;
}>;

export default function SectionWrapper({ children, title, icon, actions, wrapperClassName }: SectionWrapperProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full min-h-0 flex-col gap-6 rounded-xl border px-3 py-4 shadow-xs", wrapperClassName)}>
			<div className="flex items-center justify-between min-h-8">
				<div className="flex items-center gap-1">
					{icon}
					<h1 className="text-xs font-bold tracking-tight uppercase">{title}</h1>
				</div>
				{actions}
			</div>
			<div className="flex w-full min-h-0 flex-1 flex-col gap-3">{children}</div>
		</div>
	);
}
