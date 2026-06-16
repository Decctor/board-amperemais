import { Progress } from "@/components/ui/progress";
import type { TContinueLearningItem } from "@/lib/community";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type ContinueLearningCardProps = {
	item: TContinueLearningItem;
};

export function ContinueLearningCard({ item }: ContinueLearningCardProps) {
	return (
		<Link
			href={item.href}
			className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:shadow-md sm:flex-row sm:items-center sm:gap-5"
		>
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{item.courseTitle}</p>
				<p className="mt-1 truncate text-sm font-semibold tracking-tight">{item.lessonTitle}</p>
				<div className="mt-3 flex items-center gap-3">
					<Progress value={item.progressPercent} className="h-1.5 flex-1 bg-muted" />
					<span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{item.progressPercent}%</span>
				</div>
			</div>
			<span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
				Continuar
				<ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
			</span>
		</Link>
	);
}
