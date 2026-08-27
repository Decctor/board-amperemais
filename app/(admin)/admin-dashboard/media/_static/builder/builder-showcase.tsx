"use client";

import { BUILDER_STAGES, STAGE_ORDER, type TBuilderStageId } from "@/app/dashboard/growth/campaigns/_module/builder/helpers/stages";
import { cn } from "@/lib/utils";
import { useState } from "react";
import BuilderStepper from "./builder-stepper";
import StageAudience from "./stages/stage-audience";
import StageEffects from "./stages/stage-effects";
import StageReview from "./stages/stage-review";
import StageSend from "./stages/stage-send";
import StageSettings from "./stages/stage-settings";
import StageTrigger from "./stages/stage-trigger";

/** A campanha da fixture é de cashback expirando, que vive na categoria de eventos. */
const SHOWCASE_CATEGORY = "EVENT" as const;

type BuilderShowcaseProps = {
	stage: TBuilderStageId;
	/** Só usado na etapa de gatilho: grade de gatilhos ou gatilho já configurado. */
	triggerPanel: "grid" | "inlineConfig";
	showStepper: boolean;
};

/**
 * Réplica estática de uma etapa do construtor, com a mesma casca do
 * `builder-shell` de produção (stepper + cartão com borda).
 */
export function BuilderShowcase({ stage, triggerPanel, showStepper }: BuilderShowcaseProps) {
	return (
		<div className="mx-auto flex w-full flex-col gap-4 px-3 py-4 lg:px-6">
			{showStepper ? <BuilderStepper currentStage={stage} /> : null}
			<div className="rounded-xl border border-border bg-background p-3 shadow-sm lg:p-5">
				{stage === "trigger" ? <StageTrigger selectedCategory={SHOWCASE_CATEGORY} panel={triggerPanel} /> : null}
				{stage === "send" ? <StageSend /> : null}
				{stage === "audience" ? <StageAudience selectedCategory={SHOWCASE_CATEGORY} /> : null}
				{stage === "effects" ? <StageEffects /> : null}
				{stage === "settings" ? <StageSettings /> : null}
				{stage === "review" ? <StageReview selectedCategory={SHOWCASE_CATEGORY} /> : null}
			</div>
		</div>
	);
}

type BuilderShowcaseControlsProps = {
	stage: TBuilderStageId;
	onStageChange: (stage: TBuilderStageId) => void;
	triggerPanel: "grid" | "inlineConfig";
	onTriggerPanelChange: (panel: "grid" | "inlineConfig") => void;
	showStepper: boolean;
	onShowStepperChange: (show: boolean) => void;
};

/** Seletor de etapa que fica FORA do frame de captura — não sai no PNG. */
export function BuilderShowcaseControls({
	stage,
	onStageChange,
	triggerPanel,
	onTriggerPanelChange,
	showStepper,
	onShowStepperChange,
}: BuilderShowcaseControlsProps) {
	return (
		<div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
			<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Etapa</span>
			{STAGE_ORDER.map((stageId) => (
				<ShowcaseChip key={stageId} active={stageId === stage} onClick={() => onStageChange(stageId)}>
					{BUILDER_STAGES[stageId].label}
				</ShowcaseChip>
			))}

			<span className="ml-auto flex items-center gap-2">
				{stage === "trigger" ? (
					<>
						<ShowcaseChip active={triggerPanel === "grid"} onClick={() => onTriggerPanelChange("grid")}>
							Grade
						</ShowcaseChip>
						<ShowcaseChip active={triggerPanel === "inlineConfig"} onClick={() => onTriggerPanelChange("inlineConfig")}>
							Configurado
						</ShowcaseChip>
					</>
				) : null}
				<ShowcaseChip active={showStepper} onClick={() => onShowStepperChange(!showStepper)}>
					Stepper
				</ShowcaseChip>
			</span>
		</div>
	);
}

function ShowcaseChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"rounded-full border px-2.5 py-1 text-xs font-semibold transition",
				active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
			)}
		>
			{children}
		</button>
	);
}

/** Estado local do showcase, para a página não precisar conhecer os detalhes. */
export function useBuilderShowcaseState() {
	const [stage, setStage] = useState<TBuilderStageId>("trigger");
	const [triggerPanel, setTriggerPanel] = useState<"grid" | "inlineConfig">("grid");
	const [showStepper, setShowStepper] = useState(true);
	return { stage, setStage, triggerPanel, setTriggerPanel, showStepper, setShowStepper };
}
