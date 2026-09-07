"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import SectionApplyBar from "@/components/Utils/SectionApplyBar";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { getErrorMessage } from "@/lib/errors";
import { IFOOD_DAYS_OF_WEEK, type TIfoodDayOfWeek } from "@/lib/integrations/ifood/merchant-types";
import {
	computeEndTime,
	findOverlappingShifts,
	formatDuration,
	summarizeOpeningHours,
	toMinutes,
	toTimeInputValue,
	toTimeLabel,
	type TOpeningShift,
} from "@/lib/integrations/ifood/opening-hours";
import { updateIfoodOpeningHours } from "@/lib/mutations/ifood";
import { useIfoodOpeningHours } from "@/lib/queries/ifood";
import { useInternalIfoodOpeningHoursState, type TIfoodOpeningShiftState } from "@/state-hooks/use-internal-ifood-opening-hours-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { IFOOD_DAY_LABELS } from "../shared/ifood-status-config";
import { OpeningHoursDayRow, type TDayPeriod } from "./OpeningHoursDayRow";

const MINUTES_IN_DAY = 24 * 60;
/** Folga entre o fim do último período do dia e o início do próximo sugerido. */
const NEW_PERIOD_GAP_MINUTES = 60;
const NEW_PERIOD_DURATION_MINUTES = 120;

/** Assinatura estável de um conjunto de turnos, para comparar estado local com o do iFood. */
function serializeShifts(turnos: TOpeningShift[]) {
	return [...turnos]
		.map((turno) => ({
			dayIndex: IFOOD_DAYS_OF_WEEK.indexOf(turno.diaSemana),
			inicio: toTimeInputValue(turno.inicio),
			duracaoMinutos: turno.duracaoMinutos,
		}))
		.sort((a, b) => a.dayIndex - b.dayIndex || a.inicio.localeCompare(b.inicio) || a.duracaoMinutos - b.duracaoMinutos)
		.map((turno) => `${turno.dayIndex}|${turno.inicio}|${turno.duracaoMinutos}`)
		.join(",");
}

/** "08:00–18:00 de segunda-feira" — usado para nomear o período com que houve sobreposição. */
function describeShift(turno: TOpeningShift) {
	const inicio = toTimeInputValue(turno.inicio);
	return `${inicio}–${computeEndTime(inicio, turno.duracaoMinutos)} de ${IFOOD_DAY_LABELS[turno.diaSemana].toLowerCase()}`;
}

/** Sugere o próximo período do dia depois do último cadastrado, com folga, para não nascer em conflito. */
function buildNextPeriod(diaSemana: TIfoodDayOfWeek, periods: TDayPeriod[]): TIfoodOpeningShiftState {
	const fallback = { diaSemana, inicio: "08:00:00", duracaoMinutos: 600 };
	if (periods.length === 0) return fallback;

	const lastEnd = Math.max(...periods.map(({ turno }) => toMinutes(turno.inicio) + turno.duracaoMinutos));
	const start = lastEnd + NEW_PERIOD_GAP_MINUTES;
	const available = MINUTES_IN_DAY - start;
	if (available < 30) return fallback;

	return { diaSemana, inicio: `${toTimeLabel(start)}:00`, duracaoMinutos: Math.min(NEW_PERIOD_DURATION_MINUTES, available) };
}

type IfoodOpeningHoursSectionProps = {
	merchantId: string | null;
	canManage: boolean;
};

/**
 * Seção dos horários de funcionamento da loja no iFood, como tabela dos sete dias da semana: o dia
 * é estrutura fixa e o que se cadastra são os períodos. Dia sem período é a loja fechada.
 *
 * O PUT da API substitui o conjunto inteiro de turnos, então a seção acumula as edições localmente
 * e aplica tudo de uma vez pela `SectionApplyBar`.
 */
export function IfoodOpeningHoursSection({ merchantId, canManage }: IfoodOpeningHoursSectionProps) {
	const queryClient = useQueryClient();
	const { data: turnos, isLoading, isError, error, queryKey } = useIfoodOpeningHours({ merchantId });
	const { state, addShift, updateShift, removeShift, replicateDay, redefineState } = useInternalIfoodOpeningHoursState({ initialState: {} });

	const serverShifts = useMemo(
		() => (turnos ?? []).map((turno) => ({ diaSemana: turno.diaSemana, inicio: turno.inicio, duracaoMinutos: turno.duracaoMinutos })),
		[turnos],
	);
	const serverSignature = useMemo(() => serializeShifts(serverShifts), [serverShifts]);
	const isDirty = useMemo(() => serializeShifts(state.turnos) !== serverSignature, [state.turnos, serverSignature]);

	/**
	 * Hidrata o estado local a partir do iFood. Enquanto houver edição não aplicada, um refetch não
	 * pode apagar o que o usuário digitou — a barra de alterações existe justamente para ele decidir.
	 */
	const hydratedSignatureRef = useRef<string | null>(null);
	useEffect(() => {
		if (!turnos) return;
		if (hydratedSignatureRef.current === serverSignature) return;
		if (hydratedSignatureRef.current !== null && isDirty) return;
		hydratedSignatureRef.current = serverSignature;
		redefineState({ turnos: serverShifts });
	}, [turnos, serverShifts, serverSignature, isDirty, redefineState]);

	const { mutate: saveOpeningHours, isPending } = useMutation({
		mutationKey: ["update-ifood-opening-hours", merchantId],
		mutationFn: updateIfoodOpeningHours,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
			queryClient.invalidateQueries({ queryKey: ["ifood-merchant-status", merchantId] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const periodsByDay = useMemo(() => {
		const grouped = new Map<TIfoodDayOfWeek, TDayPeriod[]>(IFOOD_DAYS_OF_WEEK.map((day) => [day, []]));
		state.turnos.forEach((turno, index) => grouped.get(turno.diaSemana)?.push({ turno, index }));
		grouped.forEach((periods) => periods.sort((a, b) => toMinutes(a.turno.inicio) - toMinutes(b.turno.inicio)));
		return grouped;
	}, [state.turnos]);

	const conflictLabelByIndex = useMemo(() => {
		const conflicts = findOverlappingShifts(state.turnos);
		const labels = new Map<number, string>();
		conflicts.forEach((conflictingIndexes, index) => {
			const label =
				conflictingIndexes.length === 1
					? `Sobrepõe ${describeShift(state.turnos[conflictingIndexes[0]])}.`
					: `Sobrepõe outros ${conflictingIndexes.length} períodos.`;
			labels.set(index, label);
		});
		return labels;
	}, [state.turnos]);

	const summary = useMemo(() => summarizeOpeningHours(state.turnos), [state.turnos]);

	const handleDiscard = useCallback(() => redefineState({ turnos: serverShifts }), [redefineState, serverShifts]);

	const handleAddPeriod = useCallback(
		(diaSemana: TIfoodDayOfWeek) => addShift(buildNextPeriod(diaSemana, periodsByDay.get(diaSemana) ?? [])),
		[addShift, periodsByDay],
	);

	const hasConflicts = conflictLabelByIndex.size > 0;

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Clock className="w-4 h-4 min-w-4 min-h-4" />
				</Section.Icon>
				<Section.Title>HORÁRIOS DE FUNCIONAMENTO</Section.Title>
				<Section.Actions>
					{merchantId && !isLoading && !isError ? (
						<Chip.Root variant="muted" shape="pill" size="sm">
							<Chip.Label weight="semibold">
								{summary.openDays === 0
									? "Nenhum dia aberto"
									: `${summary.openDays} ${summary.openDays === 1 ? "dia" : "dias"} · ${formatDuration(summary.weeklyMinutes)} por semana`}
							</Chip.Label>
						</Chip.Root>
					) : null}
				</Section.Actions>
			</Section.Header>
			<Section.Body>
				{!merchantId ? (
					<IfoodSectionEmpty icon={Store} message="Selecione uma loja para configurar os horários de funcionamento." />
				) : isLoading ? (
					<IfoodSectionLoading rows={3} />
				) : isError ? (
					<ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar os horários de funcionamento."} />
				) : (
					<>
						<div className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-background">
							<div className="hidden min-h-9 w-full items-center border-b border-border bg-muted/60 px-3 py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground lg:flex">
								<p className="w-[26%]">Dia</p>
								<p className="flex-1">Períodos</p>
							</div>
							{IFOOD_DAYS_OF_WEEK.map((diaSemana) => (
								<OpeningHoursDayRow
									key={diaSemana}
									diaSemana={diaSemana}
									periods={periodsByDay.get(diaSemana) ?? []}
									canManage={canManage}
									conflictLabelByIndex={conflictLabelByIndex}
									onAddPeriod={handleAddPeriod}
									onUpdatePeriod={updateShift}
									onRemovePeriod={removeShift}
									onReplicate={(targets) => replicateDay({ source: diaSemana, targets })}
								/>
							))}
						</div>

						{canManage && merchantId ? (
							<SectionApplyBar
								isDirty={isDirty}
								isPending={isPending}
								disabled={hasConflicts}
								disabledReason={hasConflicts ? "Corrija as sobreposições para aplicar." : null}
								onApply={() => saveOpeningHours({ merchantId, turnos: state.turnos })}
								onDiscard={handleDiscard}
							/>
						) : null}
					</>
				)}
			</Section.Body>
		</Section.Root>
	);
}
