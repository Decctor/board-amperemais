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
 */
export function useInternalIfoodOpeningHoursState({ initialState }: TUseInternalIfoodOpeningHoursStateProps) {
	const initialStateHolder: TIfoodOpeningHoursState = useMemo(() => {
		return {
			turnos: initialState?.turnos ?? [],
		};
		// oxlint-disable-next-line react/exhaustive-deps -- Initialize state only once
	}, []);
	const [state, setState] = useState<TIfoodOpeningHoursState>(initialStateHolder);

	const addTurno = useCallback((turno?: Partial<TIfoodOpeningShiftState>) => {
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

	const updateTurno = useCallback((index: number, turno: Partial<TIfoodOpeningShiftState>) => {
		setState((prev) => ({
			...prev,
			turnos: prev.turnos.map((item, i) => (i === index ? { ...item, ...turno } : item)),
		}));
	}, []);

	const removeTurno = useCallback((index: number) => {
		setState((prev) => ({ ...prev, turnos: prev.turnos.filter((_, i) => i !== index) }));
	}, []);

	const removeTurnosDoDia = useCallback((diaSemana: TIfoodDayOfWeek) => {
		setState((prev) => ({ ...prev, turnos: prev.turnos.filter((turno) => turno.diaSemana !== diaSemana) }));
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	const redefineState = useCallback((state: TIfoodOpeningHoursState) => {
		setState(state);
	}, []);

	return {
		state,
		addTurno,
		updateTurno,
		removeTurno,
		removeTurnosDoDia,
		resetState,
		redefineState,
	};
}
export type TUseInternalIfoodOpeningHoursState = ReturnType<typeof useInternalIfoodOpeningHoursState>;
