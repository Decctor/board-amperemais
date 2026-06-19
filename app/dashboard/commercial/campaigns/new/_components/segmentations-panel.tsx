"use client";

import { useCampaignUtilPreviewSegmentationAudience } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { RFMLabels } from "@/utils/rfm";
import { Loader2 } from "lucide-react";
import { useBuilderCampaign } from "./builder-provider";

function formatSegmentCount(n: number) {
	return n.toLocaleString("pt-BR");
}

/**
 * The slice of campaign-state needed to toggle RFM segmentations. Both the
 * builder (via context) and the standalone section-edit modal (via a local
 * `useCampaignState`) can satisfy it, keeping the selector UI reusable.
 */
export type TSegmentationsController = Pick<TUseCampaignState, "state" | "addSegmentation" | "updateSegmentation" | "deleteSegmentation">;

type SegmentationsFieldProps = {
	controller: TSegmentationsController;
	title?: string;
	description?: string;
};

/**
 * Presentational segmentation picker driven by an explicit controller. Use this
 * directly when there is no BuilderProvider in scope (e.g. the section modal).
 */
export function SegmentationsField({
	controller,
	title = "Segmentações RFM",
	description = "Selecione as segmentações que serão consideradas para esta campanha.",
}: SegmentationsFieldProps) {
	const { state, addSegmentation, updateSegmentation, deleteSegmentation } = controller;
	const { data: audience, isLoading } = useCampaignUtilPreviewSegmentationAudience();

	function handleSegmentationToggle(labelText: string) {
		const idx = state.segmentations.findIndex((s) => s.segmentacao === labelText);
		if (idx < 0) {
			addSegmentation({ segmentacao: labelText });
			return;
		}
		const row = state.segmentations[idx];
		if (row.deletar) {
			if (row.id) updateSegmentation({ ...row, deletar: false });
			return;
		}
		deleteSegmentation(idx);
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex flex-col">
				<h3 className="text-sm font-semibold tracking-tight text-foreground/80">{title}</h3>
				{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
			</div>
			<div className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{RFMLabels.map((label) => {
					const isActive = state.segmentations.some((s) => s.segmentacao === label.text && !s.deletar);
					const count = audience?.bySegment[label.text];
					return (
						<button
							key={label.text}
							type="button"
							onClick={() => handleSegmentationToggle(label.text)}
							className={cn(
								"group inline-flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-3 text-left text-xs font-medium transition-colors hover:border-border/30",
								isActive && cn(label.backgroundCollor, label.textCollor, "border-transparent"),
							)}
							aria-pressed={isActive}
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
		</div>
	);
}

type SegmentationsPanelProps = {
	title?: string;
	description?: string;
};

/**
 * Builder-bound wrapper: pulls the controller from BuilderProvider context.
 * Kept as the default export so the wizard stages stay unchanged.
 */
export default function SegmentationsPanel(props: SegmentationsPanelProps) {
	const controller = useBuilderCampaign();
	return <SegmentationsField controller={controller} {...props} />;
}
