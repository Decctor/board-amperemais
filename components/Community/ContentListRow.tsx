import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

type ContentListRowProps = {
	href: string;
	title: string;
	subtitle?: string;
	meta: string;
	kind: "curso" | "material";
	className?: string;
};

export function ContentListRow({ href, title, subtitle, meta, kind, className }: ContentListRowProps) {
	const Icon = kind === "curso" ? BookOpen : FileText;

	return (
		<Link
			href={href}
			className={cn(
				"group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:-translate-y-px hover:border-border hover:shadow-md",
				className,
			)}
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
				<Icon className="size-4" strokeWidth={1.75} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold tracking-tight group-hover:text-foreground">{title}</p>
				{subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
			</div>
			<div className="hidden shrink-0 items-center gap-2 sm:flex">
				<span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{meta}</span>
				<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}
