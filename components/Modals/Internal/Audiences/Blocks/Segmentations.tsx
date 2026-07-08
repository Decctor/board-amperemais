"use client";

import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { previewAudience } from "@/lib/queries/audiences";
import { cn } from "@/lib/utils";
import type { TUseInternalAudienceState } from "@/state-hooks/use-internal-audience-state";
import { RFMLabels } from "@/utils/rfm";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";

const ALL_SEGMENTS = RFMLabels.map((label) => label.text);

function formatSegmentCount(n: number) {
	return n.toLocaleString("pt-BR");
}

type AudienceSegmentationsBlockProps = {
	segmentacoes: TUseInternalAudienceState["state"]["segmentacoes"];
	toggleSegmentacao: TUseInternalAudienceState["toggleSegmentacao"];
};
export default function AudienceSegmentationsBlock({ segmentacoes, toggleSegmentacao }: AudienceSegmentationsBlockProps) {
	// Catalog of per-segment sizes (independent of the current selection) so each chip
	// can display how many clients live in that segment.
	const { data: preview, isLoading } = useQuery({
		queryKey: ["audience-segment-catalog"],
		queryFn: () => previewAudience({ segmentacoes: ALL_SEGMENTS }),
	});

	return (
		<ResponsiveMenuSection title="SEGMENTAÇÕES (RFM)" icon={<Sparkles className="h-4 w-4" />}>
			<p className="text-xs italic text-muted-foreground">Selecione as segmentações RFM que compõem a base deste público.</p>
			<div className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{RFMLabels.map((label) => {
					const isActive = segmentacoes.includes(label.text);
					const count = preview?.bySegment[label.text];
					return (
						<button
							key={label.text}
							type="button"
							onClick={() => toggleSegmentacao(label.text)}
							aria-pressed={isActive}
							className={cn(
								"group inline-flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-3 text-left text-xs font-medium transition-colors hover:border-border/30",
								isActive && cn(label.backgroundCollor, label.textCollor, "border-transparent"),
							)}
						>
							<span className="min-w-0 truncate uppercase">{label.text}</span>
							<span
								className={cn(
									"shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
									isActive ? "bg-black/15" : "bg-muted text-muted-foreground",
								)}
							>
								{isLoading ? (
									<Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden />
								) : typeof count === "number" ? (
									formatSegmentCount(count)
								) : (
									"—"
								)}
							</span>
						</button>
					);
				})}
			</div>
		</ResponsiveMenuSection>
	);
}
