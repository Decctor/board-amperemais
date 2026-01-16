import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

type SelectableCardProps = {
	selected: boolean;
	onSelect: () => void;
	icon?: ReactNode;
	label: string;
	description?: string;
	className?: string;
	children?: ReactNode;
};

export function SelectableCard({ selected, onSelect, icon, label, description, className, children }: SelectableCardProps) {
	return (
		<div
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			tabIndex={0}
			role="button"
			aria-pressed={selected}
			className={cn(
				"relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ease-in-out hover:border-primary/50 hover:bg-muted/50 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2",
				selected ? "border-primary bg-primary/5 shadow-md" : "border-muted bg-card hover:shadow-sm",
				className,
			)}
		>
			{selected && (
				<div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<Check className="h-3 w-3" />
				</div>
			)}
			<div className="flex flex-col items-center gap-3 text-center">
				{icon && <div className={cn("text-3xl text-muted-foreground transition-colors", selected && "text-primary")}>{icon}</div>}
				<div className="flex flex-col gap-1">
					<span className={cn("font-medium text-sm transition-colors", selected ? "text-primary" : "text-foreground")}>{label}</span>
					{description && <span className="text-xs text-muted-foreground">{description}</span>}
				</div>
				{children}
			</div>
		</div>
	);
}
