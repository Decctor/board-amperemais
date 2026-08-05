"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { TRegistrationStep } from "./registration-steps";

type ProgressJourneyProps = {
	steps: TRegistrationStep[];
	/** Índice do passo atual dentro de `steps`. */
	currentIndex: number;
	className?: string;
};

/**
 * Trilha de progresso do assistente de cadastro.
 *
 * Genérica em N passos: a linha começa e termina no centro do primeiro e do último marcador, o que
 * é meia coluna de recuo em cada ponta — `100% / (2N)`. A demo de origem fixava esse recuo em
 * 16,66% porque tinha sempre três passos; aqui o número depende do que a organização configurou.
 */
export function ProgressJourney({ steps, currentIndex, className }: ProgressJourneyProps) {
	if (steps.length === 0) return null;

	const halfColumnInset = `${100 / (steps.length * 2)}%`;
	// Um passo só não tem trecho a percorrer — evita a divisão por zero e a barra "sempre cheia".
	const filledRatio = steps.length > 1 ? currentIndex / (steps.length - 1) : 1;

	return (
		<div className={cn("relative", className)}>
			{steps.length > 1 ? (
				<div className="absolute top-4 h-0.5 bg-brand-foreground/15" style={{ left: halfColumnInset, right: halfColumnInset }}>
					<div
						className="h-full bg-brand-foreground/70 transition-[width] duration-500 ease-out motion-reduce:transition-none"
						style={{ width: `${filledRatio * 100}%` }}
					/>
				</div>
			) : null}

			<ol className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
				{steps.map((step, stepIndex) => {
					const isReached = stepIndex <= currentIndex;
					const isCurrent = stepIndex === currentIndex;
					const StepIcon = step.icone;
					return (
						<li key={step.chave} className="flex min-w-0 flex-col items-center text-center" aria-current={isCurrent ? "step" : undefined}>
							<span
								className={cn(
									"relative z-10 flex size-8 items-center justify-center rounded-full border transition-all duration-300 motion-reduce:transition-none",
									isReached ? "border-brand-foreground bg-brand-foreground text-brand" : "border-brand-foreground/25 bg-brand text-brand-foreground/55",
									isCurrent && "poi-progress-pop ring-4 ring-brand-foreground/10",
								)}
							>
								{isReached && !isCurrent ? <Check className="size-4" strokeWidth={3} /> : <StepIcon className="size-4" />}
							</span>
							<span
								className={cn(
									"mt-2 max-w-[6rem] truncate text-[0.58rem] font-bold uppercase leading-tight tracking-wide",
									isReached ? "text-brand-foreground" : "text-brand-foreground/45",
								)}
							>
								{step.rotulo}
							</span>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
