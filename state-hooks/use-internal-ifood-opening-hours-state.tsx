import { IFOOD_DAYS_OF_WEEK, type TIfoodDayOfWeek } from "@/lib/integrations/ifood/merchant-types";
import { useCallback, useMemo, useState } from "react";
import z from "zod";

const IfoodOpeningShiftStateSchema = z.object({
	diaSemana: z.enum(IFOOD_DAYS_OF_WEEK, {
		required_error: "Dia da semana do turno não informado.",
		invalid_type_error: "Tipo não válido para o dia da semana do turno.",
	}),
	inicio: z.string({
		required_error: "Horário de início do turno não informado.",
		invalid_type_error: "Tipo não válido para o horário de início do turno.",
	}),
	duracaoMinutos: z.number({
		required_error: "Duração do turno não informada.",
		invalid_type_error: "Tipo não válido para a duração do turno.",
	}),
});

const IfoodOpeningHoursStateSchema = z.object({
	turnos: z.array(IfoodOpeningShiftStateSchema),
});
type TIfoodOpeningHoursState = z.infer<typeof IfoodOpeningHoursStateSchema>;
export type TIfoodOpeningShiftState = TIfoodOpeningHoursState["turnos"][number];

type TUseInternalIfoodOpeningHoursStateProps = {
	initialState?: Partial<TIfoodOpeningHoursState>;
};

/**
 * Estado local do editor de horários de funcionamento do iFood. O PUT da API substitui o conjunto
 * inteiro de turnos, então não há soft-delete (`deletar`) — remover é filtrar da lista.
 *
 * A lista é plana como a API a espera; a visão por dia da semana é derivada na UI.
 */
export function useInternalIfoodOpeningHoursState({ initialState }: TUseInternalIfoodOpeningHoursStateProps) {
	const initialStateHolder: TIfoodOpeningHoursState = useMemo(() => {
		return {
			turnos: initialState?.turnos ?? [],
		};
		// oxlint-disable-next-line react/exhaustive-deps -- Initialize state only once
	}, []);
	const [state, setState] = useState<TIfoodOpeningHoursState>(initialStateHolder);

	const addShift = useCallback((turno?: Partial<TIfoodOpeningShiftState>) => {
		setState((prev) => ({
			...prev,
			turnos: [
				...prev.turnos,
				{
					diaSemana: turno?.diaSemana ?? "MONDAY",
					inicio: turno?.inicio ?? "08:00:00",
					duracaoMinutos: turno?.duracaoMinutos ?? 600,
				},
			],
		}));
	}, []);

	const updateShift = useCallback((index: number, turno: Partial<TIfoodOpeningShiftState>) => {
		setState((prev) => ({
			...prev,
			turnos: prev.turnos.map((item, i) => (i === index ? { ...item, ...turno } : item)),
		}));
	}, []);

	const removeShift = useCallback((index: number) => {
		setState((prev) => ({ ...prev, turnos: prev.turnos.filter((_, i) => i !== index) }));
	}, []);

	const removeDayShifts = useCallback((diaSemana: TIfoodDayOfWeek) => {
		setState((prev) => ({ ...prev, turnos: prev.turnos.filter((turno) => turno.diaSemana !== diaSemana) }));
	}, []);

	/** Copia os turnos de um dia para os outros, substituindo o que os dias de destino já tinham. */
	const replicateDay = useCallback(({ source, targets }: { source: TIfoodDayOfWeek; targets: TIfoodDayOfWeek[] }) => {
		setState((prev) => {
			const effectiveTargets = targets.filter((target) => target !== source);
			if (effectiveTargets.length === 0) return prev;

			const sourceShifts = prev.turnos.filter((turno) => turno.diaSemana === source);
			const untouched = prev.turnos.filter((turno) => !effectiveTargets.includes(turno.diaSemana));
			const replicated = effectiveTargets.flatMap((target) => sourceShifts.map((turno) => ({ ...turno, diaSemana: target })));

			return { ...prev, turnos: [...untouched, ...replicated] };
		});
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	const redefineState = useCallback((state: TIfoodOpeningHoursState) => {
		setState(state);
	}, []);

	return {
		state,
		addShift,
		updateShift,
		removeShift,
		removeDayShifts,
		replicateDay,
		resetState,
		redefineState,
	};
}
export type TUseInternalIfoodOpeningHoursState = ReturnType<typeof useInternalIfoodOpeningHoursState>;
