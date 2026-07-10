"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { COUPON_STAGES, STAGE_ORDER } from "../helpers/stages";
import { useBuilderUi } from "./builder-provider";

/**
 * Horizontal stepper. Create flow is linear: only stages up to and including the
 * current one are clickable, so the lojista moves forward one decision at a time.
 */
export default function BuilderStepper() {
	const { currentStage, setCurrentStage } = useBuilderUi();
	const currentIdx = useMemo(() => STAGE_ORDER.indexOf(currentStage), [currentStage]);

	return (
		<nav aria-label="Progresso do cupom" className="w-full">
			<ol className="flex w-full items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
				{STAGE_ORDER.map((stageId, idx) => {
					const stage = COUPON_STAGES[stageId];
					const Icon = stage.icon;
					const isActive = stageId === currentStage;
					const isComplete = idx < currentIdx;
					const isClickable = idx <= currentIdx;

					return (
						<li key={stageId} className="flex flex-1 min-w-[116px] items-center">
							<button
								type="button"
								onClick={() => (isClickable ? setCurrentStage(stageId) : undefined)}
								disabled={!isClickable}
								aria-current={isActive ? "step" : undefined}
								className={cn(
									"group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
									isActive && "bg-primary/10",
									!isActive && isClickable && "hover:bg-primary/5",
									!isClickable && "cursor-not-allowed opacity-55",
								)}
							>
								<span
									className={cn(
										"flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
										isActive && "border-primary bg-primary text-primary-foreground",
										isComplete && "border-primary bg-primary/15 text-primary",
										!isActive && !isComplete && "border-primary/20 text-primary/70",
									)}
								>
									{isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
								</span>
								<span className="flex min-w-0 flex-col">
									<span className={cn("truncate text-[10px] font-semibold uppercase tracking-wide", isActive ? "text-foreground" : "text-muted-foreground")}>
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
