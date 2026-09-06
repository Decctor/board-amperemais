"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type TJourneyRailStageState = "concluida" | "atual" | "pendente" | "adiada";

export type TJourneyRailStage = {
	id: string;
	rotulo: string;
	estado: TJourneyRailStageState;
	/** Etapas já visitadas (ou concluídas) podem ser clicadas; as futuras não. */
	navegavel: boolean;
};

type JourneyRailProps = {
	journeyLabel: string;
	stages: TJourneyRailStage[];
	onSelect: (stageId: string) => void;
	/** Bloco compacto sob a lista (ex.: progresso da carga histórica). */
	footer?: ReactNode;
};

function StageMarker({ estado }: { estado: TJourneyRailStageState }) {
	if (estado === "concluida") {
		return (
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
				<Check className="size-3" strokeWidth={3} />
			</span>
		);
	}
	if (estado === "atual") {
		return (
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-foreground">
				<span className="size-2 rounded-full bg-foreground" />
			</span>
		);
	}
	return <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />;
}

function StageList({ stages, onSelect }: Pick<JourneyRailProps, "stages" | "onSelect">) {
	return (
		<ol className="flex flex-col gap-0.5">
			{stages.map((stage) => {
				const isCurrent = stage.estado === "atual";
				return (
					<li key={stage.id}>
						<button
							type="button"
							disabled={!stage.navegavel}
							aria-current={isCurrent ? "step" : undefined}
							onClick={() => onSelect(stage.id)}
							className={cn(
								"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
								isCurrent ? "bg-secondary font-bold text-foreground" : "font-medium text-muted-foreground",
								stage.navegavel && !isCurrent && "hover:bg-secondary/60 hover:text-foreground",
								!stage.navegavel && "cursor-default",
							)}
						>
							<StageMarker estado={stage.estado} />
							<span className="min-w-0 grow truncate">{stage.rotulo}</span>
							{stage.estado === "adiada" ? <span className="text-[11px] font-semibold text-muted-foreground">Depois</span> : null}
						</button>
					</li>
				);
			})}
		</ol>
	);
}

export function JourneyRail({ journeyLabel, stages, onSelect, footer }: JourneyRailProps) {
	const currentIndex = Math.max(
		0,
		stages.findIndex((stage) => stage.estado === "atual"),
	);
	const current = stages[currentIndex];

	return (
		<>
			{/* Mobile: barras de progresso + lista num popover. */}
			<nav aria-label={journeyLabel} className="flex flex-col gap-3">
				<div className="flex items-center gap-1" aria-hidden>
					{stages.map((stage) => (
						<span
							key={stage.id}
							className={cn(
								"h-1 grow rounded-full transition-colors duration-300",
								stage.estado === "concluida" ? "bg-brand" : stage.estado === "atual" ? "bg-foreground" : "bg-border",
							)}
						/>
					))}
				</div>
				<div className="flex items-center justify-between">
					<p className="text-[11px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
						Etapa {currentIndex + 1} de {stages.length}
						{current ? ` · ${current.rotulo}` : ""}
					</p>
					<Popover key={current?.id}>
						<PopoverTrigger className="flex min-h-11 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
							Ver etapas
							<ChevronDown className="size-3.5" />
						</PopoverTrigger>
						<PopoverContent align="end" className="w-64 p-2">
							<StageList stages={stages} onSelect={onSelect} />
						</PopoverContent>
					</Popover>
				</div>
			</nav>

			{footer ? <div className="mt-3">{footer}</div> : null}
		</>
	);
}
