"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/segmentations-panel.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useCampaignUtilPreviewSegmentationAudience` (a contagem
 * por segmento vem da fixture) e sem o toggle — os botões continuam desenhados, mas
 * são inertes. Ao mexer no original, refaça o diff contra este arquivo.
 */
import { cn } from "@/lib/utils";
import { RFMLabels } from "@/utils/rfm";
import { STATIC_BUILDER_CAMPAIGN, STATIC_SEGMENT_AUDIENCE } from "../../_fixtures/campaign-builder";

function formatSegmentCount(n: number) {
	return n.toLocaleString("pt-BR");
}

type SegmentationsPanelProps = {
	title?: string;
	description?: string;
};

export default function SegmentationsPanel({
	title = "Segmentações RFM",
	description = "Selecione as segmentações que serão consideradas para esta campanha.",
}: SegmentationsPanelProps) {
	const { state } = STATIC_BUILDER_CAMPAIGN;

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex flex-col">
				<h3 className="text-sm font-semibold tracking-tight text-foreground/80">{title}</h3>
				{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
			</div>
			<div className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{RFMLabels.map((label) => {
					const isActive = state.segmentations.some((s) => s.segmentacao === label.text && !s.deletar);
					const count = STATIC_SEGMENT_AUDIENCE[label.text];
					return (
						<button
							key={label.text}
							type="button"
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
								{typeof count === "number" ? formatSegmentCount(count) : "—"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
