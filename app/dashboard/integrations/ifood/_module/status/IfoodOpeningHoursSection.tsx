"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { IFOOD_DAYS_OF_WEEK, type TIfoodDayOfWeek } from "@/lib/integrations/ifood/merchant-types";
import { updateIfoodOpeningHours } from "@/lib/mutations/ifood";
import { useIfoodOpeningHours } from "@/lib/queries/ifood";
import { useInternalIfoodOpeningHoursState } from "@/state-hooks/use-internal-ifood-opening-hours-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Store, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { IFOOD_DAY_LABELS } from "../shared/ifood-status-config";

/** "HH:MM:SS" → "HH:MM" (valor do input time). */
function toTimeInputValue(time: string) {
	return time.slice(0, 5);
}

/** Início "HH:MM" + duração em minutos → fim "HH:MM" (pode virar o dia). */
function computeEndTime(inicio: string, duracaoMinutos: number) {
	const [hours, minutes] = inicio.split(":").map(Number);
	const totalMinutes = (hours * 60 + minutes + duracaoMinutos) % (24 * 60);
	return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

/** Início e fim "HH:MM" → duração em minutos (fim menor ou igual ao início = vira o dia). */
function computeDuration(inicio: string, fim: string) {
	const [startHours, startMinutes] = inicio.split(":").map(Number);
	const [endHours, endMinutes] = fim.split(":").map(Number);
	const start = startHours * 60 + startMinutes;
	const end = endHours * 60 + endMinutes;
	return end > start ? end - start : 24 * 60 - start + end;
}

type IfoodOpeningHoursSectionProps = {
	merchantId: string | null;
	canManage: boolean;
};

/**
 * Seção dos horários de funcionamento da loja no iFood. A API substitui o conjunto inteiro de
 * turnos no PUT, então a seção trabalha com a lista completa e salva de uma vez.
 */
export function IfoodOpeningHoursSection({ merchantId, canManage }: IfoodOpeningHoursSectionProps) {
	const queryClient = useQueryClient();
	const { data: turnos, isLoading, isError, error, queryKey } = useIfoodOpeningHours({ merchantId });
	const { state, addTurno, updateTurno, removeTurno, redefineState } = useInternalIfoodOpeningHoursState({ initialState: {} });

	useEffect(() => {
		if (turnos) {
			redefineState({
				turnos: turnos.map((turno) => ({
					diaSemana: turno.diaSemana,
					inicio: turno.inicio,
					duracaoMinutos: turno.duracaoMinutos,
				})),
			});
		}
	}, [turnos, redefineState]);

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

	const sortedIndexes = state.turnos
		.map((_, index) => index)
		.sort((a, b) => {
			const dayDiff = IFOOD_DAYS_OF_WEEK.indexOf(state.turnos[a].diaSemana) - IFOOD_DAYS_OF_WEEK.indexOf(state.turnos[b].diaSemana);
			if (dayDiff !== 0) return dayDiff;
			return state.turnos[a].inicio.localeCompare(state.turnos[b].inicio);
		});

	const isEditable = canManage && !!merchantId && !isLoading && !isError;

	return (
		<SectionWrapper
			title="HORÁRIOS DE FUNCIONAMENTO"
			icon={<Clock className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				isEditable ? (
					<Button variant="ghost" size="xs" onClick={() => addTurno()} className="flex items-center gap-1">
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						ADICIONAR TURNO
					</Button>
				) : null
			}
		>
			{!merchantId ? (
				<IfoodSectionEmpty icon={Store} message="Selecione uma loja para configurar os horários de funcionamento." />
			) : isLoading ? (
				<IfoodSectionLoading rows={3} />
			) : isError ? (
				<ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar os horários de funcionamento."} />
			) : (
				<>
					{state.turnos.length === 0 ? (
						<IfoodSectionEmpty icon={Clock} message="Nenhum turno de funcionamento configurado." />
					) : (
						<div className="flex w-full flex-col gap-2">
							{sortedIndexes.map((index) => {
								const turno = state.turnos[index];
								return (
									<div key={index} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center">
										<Select
											value={turno.diaSemana}
											onValueChange={(value) => updateTurno(index, { diaSemana: value as TIfoodDayOfWeek })}
											disabled={!canManage}
										>
											<SelectTrigger className="w-full sm:w-[180px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{IFOOD_DAYS_OF_WEEK.map((day) => (
													<SelectItem key={day} value={day}>
														{IFOOD_DAY_LABELS[day]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<div className="flex w-full items-center gap-2">
											<Input
												type="time"
												className="w-full sm:w-[120px]"
												value={toTimeInputValue(turno.inicio)}
												disabled={!canManage}
												onChange={(e) => {
													if (!e.target.value) return;
													updateTurno(index, { inicio: `${e.target.value}:00` });
												}}
											/>
											<span className="text-xs text-muted-foreground">até</span>
											<Input
												type="time"
												className="w-full sm:w-[120px]"
												value={computeEndTime(toTimeInputValue(turno.inicio), turno.duracaoMinutos)}
												disabled={!canManage}
												onChange={(e) => {
													if (!e.target.value) return;
													updateTurno(index, { duracaoMinutos: computeDuration(toTimeInputValue(turno.inicio), e.target.value) });
												}}
											/>
										</div>
										{canManage ? (
											<Button variant="ghost-destructive" size="sm" className="self-end sm:self-auto" onClick={() => removeTurno(index)} title="Remover turno">
												<Trash2 className="h-4 w-4" />
											</Button>
										) : null}
									</div>
								);
							})}
						</div>
					)}

					{isEditable ? (
						<div className="flex w-full justify-end border-t border-border pt-3">
							<Button onClick={() => saveOpeningHours({ merchantId, turnos: state.turnos })} disabled={isPending}>
								{isPending ? "SALVANDO..." : "SALVAR HORÁRIOS"}
							</Button>
						</div>
					) : null}
				</>
			)}
		</SectionWrapper>
	);
}
