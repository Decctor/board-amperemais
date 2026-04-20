import { cn } from "@/lib/utils";
import { PIOR_DIA_STEP_LABELS } from "../constants";
import type { PiorDiaLayoutTokens } from "../scale";
import { PiorDiaArrowConnector } from "./pior-dia-arrow-connector";
import { PiorDiaStepConfig } from "./pior-dia-step-config";
import { PiorDiaStepConversion } from "./pior-dia-step-conversion";
import { PiorDiaStepTrigger } from "./pior-dia-step-trigger";
import { PiorDiaWorkflowStep } from "./pior-dia-workflow-step";

type PiorDiaWorkflowProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

const ACCENT_RED = {
	ring: "#EF4444",
	bg: "rgba(239,68,68,0.12)",
	text: "#B91C1C",
	glow: "rgba(239,68,68,0.35)",
};

const ACCENT_AMBER = {
	ring: "#FBBF24",
	bg: "rgba(251,191,36,0.22)",
	text: "#0A1424",
	glow: "rgba(251,191,36,0.40)",
};

const ACCENT_EMERALD = {
	ring: "#10B981",
	bg: "rgba(16,185,129,0.14)",
	text: "#047857",
	glow: "rgba(16,185,129,0.32)",
};

/**
 * Workflow vertical com as 3 etapas conectadas por setas curvas:
 *  01 — Configuração (vermelho)
 *  02 — Disparo automático (âmbar)
 *  03 — Conversões (verde)
 */
export function PiorDiaWorkflow({ tokens, className }: PiorDiaWorkflowProps) {
	return (
		<div
			data-design-role="pior-dia-workflow"
			className={cn(className)}
			style={{ display: "flex", flexDirection: "column", width: "100%" }}
		>
			<PiorDiaWorkflowStep
				tokens={tokens}
				number={PIOR_DIA_STEP_LABELS.one.number}
				title={PIOR_DIA_STEP_LABELS.one.title}
				subtitle={PIOR_DIA_STEP_LABELS.one.subtitle}
				accent={ACCENT_RED}
			>
				<PiorDiaStepConfig tokens={tokens} />
			</PiorDiaWorkflowStep>

			<PiorDiaArrowConnector
				tokens={tokens}
				fromColor={ACCENT_RED.ring}
				toColor={ACCENT_AMBER.ring}
			/>

			<PiorDiaWorkflowStep
				tokens={tokens}
				number={PIOR_DIA_STEP_LABELS.two.number}
				title={PIOR_DIA_STEP_LABELS.two.title}
				subtitle={PIOR_DIA_STEP_LABELS.two.subtitle}
				accent={ACCENT_AMBER}
			>
				<PiorDiaStepTrigger tokens={tokens} />
			</PiorDiaWorkflowStep>

			<PiorDiaArrowConnector
				tokens={tokens}
				fromColor={ACCENT_AMBER.ring}
				toColor={ACCENT_EMERALD.ring}
			/>

			<PiorDiaWorkflowStep
				tokens={tokens}
				number={PIOR_DIA_STEP_LABELS.three.number}
				title={PIOR_DIA_STEP_LABELS.three.title}
				subtitle={PIOR_DIA_STEP_LABELS.three.subtitle}
				accent={ACCENT_EMERALD}
			>
				<PiorDiaStepConversion tokens={tokens} />
			</PiorDiaWorkflowStep>
		</div>
	);
}
