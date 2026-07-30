"use client";

import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import type { TIfoodDayOfWeek } from "@/lib/integrations/ifood/merchant-types";
import { computeDuration, computeEndTime, crossesMidnight, formatDuration, toTimeInputValue } from "@/lib/integrations/ifood/opening-hours";
import { cn } from "@/lib/utils";
import type { TIfoodOpeningShiftState } from "@/state-hooks/use-internal-ifood-opening-hours-state";
import { Plus } from "lucide-react";
import { IFOOD_DAY_LABELS } from "../shared/ifood-status-config";
import { OpeningHoursReplicatePopover } from "./OpeningHoursReplicatePopover";

/** Um período do dia, carregando o índice que ele ocupa na lista plana de turnos do estado. */
export type TDayPeriod = { turno: TIfoodOpeningShiftState; index: number };

type OpeningHoursDayRowProps = {
	diaSemana: TIfoodDayOfWeek;
	periods: TDayPeriod[];
	canManage: boolean;
	/** Mensagem de sobreposição por índice de turno; ausente significa período válido. */
	conflictLabelByIndex: Map<number, string>;
	onAddPeriod: (diaSemana: TIfoodDayOfWeek) => void;
	onUpdatePeriod: (index: number, turno: Partial<TIfoodOpeningShiftState>) => void;
	onRemovePeriod: (index: number) => void;
	onReplicate: (targets: TIfoodDayOfWeek[]) => void;
};

/**
 * Linha de um dia da semana. O dia é estrutura fixa — sempre visível, nunca editável; o que se
 * cadastra são os períodos. Dia sem período é a loja fechada naquele dia.
 */
export function OpeningHoursDayRow({
	diaSemana,
	periods,
	canManage,
	conflictLabelByIndex,
	onAddPeriod,
	onUpdatePeriod,
	onRemovePeriod,
	onReplicate,
}: OpeningHoursDayRowProps) {
	const isClosed = periods.length === 0;

	return (
		<div className="flex w-full flex-col border-t border-border first:border-t-0 lg:flex-row">
			<div className="flex w-full shrink-0 items-center gap-2 bg-muted/30 px-3 py-2 lg:w-[26%] lg:items-start lg:bg-transparent lg:py-3">
				<span className={cn("text-sm font-semibold tracking-tight", isClosed && "text-muted-foreground")}>{IFOOD_DAY_LABELS[diaSemana]}</span>
				{isClosed ? (
					<Chip.Root variant="muted" shape="pill" size="xs">
						<Chip.Label caps weight="bold">
							Fechada
						</Chip.Label>
					</Chip.Root>
				) : null}
			</div>

			<div className="flex w-full min-w-0 flex-col gap-1.5 px-3 py-2 lg:py-3">
				{isClosed ? (
					<p className="text-sm text-muted-foreground">Nenhum período cadastrado.</p>
				) : (
					periods.map(({ turno, index }) => (
						<PeriodLine
							key={index}
							turno={turno}
							canManage={canManage}
							conflictLabel={conflictLabelByIndex.get(index) ?? null}
							onUpdate={(patch) => onUpdatePeriod(index, patch)}
							onRemove={() => onRemovePeriod(index)}
						/>
					))
				)}

				{canManage ? (
					<div className="flex flex-wrap items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={() => onAddPeriod(diaSemana)}
							className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
						>
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							PERÍODO
						</Button>
						{isClosed ? null : <OpeningHoursReplicatePopover source={diaSemana} onReplicate={onReplicate} />}
					</div>
				) : null}
			</div>
		</div>
	);
}

type PeriodLineProps = {
	turno: TIfoodOpeningShiftState;
	canManage: boolean;
	conflictLabel: string | null;
	onUpdate: (turno: Partial<TIfoodOpeningShiftState>) => void;
	onRemove: () => void;
};

function PeriodLine({ turno, canManage, conflictLabel, onUpdate, onRemove }: PeriodLineProps) {
	const inicio = toTimeInputValue(turno.inicio);
	const fim = computeEndTime(inicio, turno.duracaoMinutos);
	const endsNextDay = crossesMidnight(inicio, turno.duracaoMinutos);

	return (
		<div className={cn("flex w-full flex-col gap-1 rounded-md", conflictLabel && "border border-destructive/40 bg-destructive/5 px-2 py-1.5")}>
			<div className="flex w-full flex-wrap items-center gap-2">
				<Input
					type="time"
					aria-label="Início do período"
					className="h-8 w-[110px]"
					value={inicio}
					disabled={!canManage}
					onChange={(e) => {
						if (!e.target.value) return;
						onUpdate({ inicio: `${e.target.value}:00`, duracaoMinutos: computeDuration(e.target.value, fim) });
					}}
				/>
				<span className="text-xs text-muted-foreground">até</span>
				<Input
					type="time"
					aria-label="Fim do período"
					className="h-8 w-[110px]"
					value={fim}
					disabled={!canManage}
					onChange={(e) => {
						if (!e.target.value) return;
						onUpdate({ duracaoMinutos: computeDuration(inicio, e.target.value) });
					}}
				/>
				{endsNextDay ? (
					<Chip.Root variant="muted" shape="pill" size="xs" title="Termina no dia seguinte">
						<Chip.Label weight="bold">+1</Chip.Label>
					</Chip.Root>
				) : null}
				<span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatDuration(turno.duracaoMinutos)}</span>
				{canManage ? <DeleteRowButton onRemove={onRemove} ariaLabel="Remover período" /> : null}
			</div>
			{conflictLabel ? <p className="text-xs text-destructive">{conflictLabel}</p> : null}
		</div>
	);
}
