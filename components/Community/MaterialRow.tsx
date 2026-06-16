import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale } from "@/lib/formatting";
import { getMaterialHref, MATERIAL_TYPE_LABELS, type TCommunityMaterialSummary } from "@/lib/community";
import { Calendar } from "lucide-react";
import Link from "next/link";

type MaterialRowProps = {
	material: TCommunityMaterialSummary;
	variant?: "row" | "card";
};

export function MaterialRow({ material, variant = "row" }: MaterialRowProps) {
	const href = getMaterialHref(material);
	const label = MATERIAL_TYPE_LABELS[material.tipo] ?? material.tipo;

	if (variant === "card") {
		return (
			<Link
				href={href}
				className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
			>
				<div className="flex items-center justify-between gap-2">
					<Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-[0.06em]">
						{label}
					</Badge>
					<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
						<Calendar className="size-3" />
						{formatDateAsLocale(material.dataInsercao)}
					</span>
				</div>
				<div>
					<h3 className="line-clamp-2 text-sm font-semibold tracking-tight">{material.titulo}</h3>
					{material.descricao ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{material.descricao}</p> : null}
				</div>
			</Link>
		);
	}

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-[0.06em]">
						{label}
					</Badge>
					<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
						<Calendar className="size-3" />
						{formatDateAsLocale(material.dataInsercao)}
					</span>
				</div>
				<h3 className="truncate text-sm font-semibold tracking-tight">{material.titulo}</h3>
				{material.descricao ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{material.descricao}</p> : null}
			</div>
			<Button asChild size="sm" variant="outline" className="shrink-0 rounded-full px-4">
				<Link href={href}>Abrir</Link>
			</Button>
		</div>
	);
}
