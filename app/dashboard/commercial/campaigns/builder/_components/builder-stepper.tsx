"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { BUILDER_STAGES, STAGE_ORDER, type TBuilderStageId } from "../_helpers/stages";
import { useBuilderUi } from "./builder-provider";

/**
 * Horizontal stepper showing every stage. In edit mode each stage is clickable
 * (free navigation since the data is already valid). In create mode only stages
 * up to and including the current one are clickable, encouraging linear flow.
 */
export default function BuilderStepper() {
	const { mode, currentStage, setCurrentStage, selectedCategory } = useBuilderUi();
	const currentIdx = useMemo(() => STAGE_ORDER.indexOf(currentStage), [currentStage]);
	const allowFreeNavigation = mode === "edit";

	function handleClick(stage: TBuilderStageId, idx: number) {
		// Always allow going back to a previous stage; only block forward jumps in create mode.
		if (idx <= currentIdx) return setCurrentStage(stage);
		if (allowFreeNavigation) return setCurrentStage(stage);
	}

	// Stepper hides the trigger stage indicator before a category is picked,
	// since it doesn't make sense to "jump" to it before there's anything to jump from.
	const showAll = !!selectedCategory || currentStage !== "trigger";

	return (
		<nav aria-label="Progresso da campanha" className="w-full">
			<ol className="flex w-full items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				{STAGE_ORDER.map((stageId, idx) => {
					const stage = BUILDER_STAGES[stageId];
					const Icon = stage.icon;
					const isActive = stageId === currentStage;
					const isComplete = idx < currentIdx;
					const isClickable = idx <= currentIdx || allowFreeNavigation;
					const isVisible = showAll || idx === 0;

					return (
						<li key={stageId} className={cn("flex flex-1 min-w-[120px] items-center", !isVisible && "opacity-40")}>
							<button
								type="button"
								onClick={() => handleClick(stageId, idx)}
								disabled={!isClickable}
								className={cn(
									"group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
									isActive && "bg-brand/10",
									!isActive && isClickable && "hover:bg-brand/5",
									!isClickable && "cursor-not-allowed opacity-60",
								)}
							>
								<span
									className={cn(
										"flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
										isActive && "border-brand bg-brand text-brand-foreground",
										isComplete && "border-brand bg-brand/20 text-brand",
										!isActive && !isComplete && "border-brand/20 text-brand/80",
									)}
								>
									{isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
								</span>
								<span className="flex min-w-0 flex-col">
									<span className={cn("truncate text-[10px] font-semibold uppercase tracking-wide", isActive ? "text-primary" : "text-muted-foreground")}>
										Etapa {idx + 1}
									</span>
									<span className={cn("truncate text-xs font-medium", isActive ? "text-foreground" : "text-foreground/70")}>{stage.label}</span>
								</span>
							</button>
							{idx < STAGE_ORDER.length - 1 ? (
								<span aria-hidden className={cn("h-px w-3 shrink-0", isComplete ? "bg-primary/40" : "bg-primary/15")} />
							) : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
