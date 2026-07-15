import { InteractionChannelEnum } from "@/schemas/enums";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import { z } from "zod";

const InteractionStateSchema = z.object({
	cliente: z
		.object({
			id: z.string({ required_error: "ID do cliente não informado.", invalid_type_error: "Tipo inválido para o ID do cliente." }),
			nome: z.string({ required_error: "Nome do cliente não informado.", invalid_type_error: "Tipo inválido para o nome do cliente." }),
			telefone: z.string({ invalid_type_error: "Tipo inválido para o telefone do cliente." }),
		})
		.nullable(),
	canal: InteractionChannelEnum,
	descricao: z.string({ invalid_type_error: "Tipo inválido para a descrição da interação." }),
	// AGENDAR cria uma interação PLANEJADA na data escolhida; EXECUTADO registra uma REALIZADA agora.
	modo: z.enum(["AGENDAR", "EXECUTADO"], { invalid_type_error: "Tipo inválido para o modo da interação." }),
	// Dia alvo do agendamento (só se aplica ao modo AGENDAR).
	dataInteracao: z.date({ invalid_type_error: "Tipo inválido para a data da interação." }).nullable(),
});
export type TInteractionState = z.infer<typeof InteractionStateSchema>;

function getDefaultState(initialState?: Partial<TInteractionState>): TInteractionState {
	return {
		cliente: initialState?.cliente ?? null,
		canal: initialState?.canal ?? "WHATSAPP",
		descricao: initialState?.descricao ?? "",
		modo: initialState?.modo ?? "AGENDAR",
		dataInteracao: initialState?.dataInteracao ?? dayjs().add(1, "day").toDate(),
	};
}

type UseInternalInteractionStateParams = {
	initialState?: Partial<TInteractionState>;
};

export function useInternalInteractionState({ initialState }: UseInternalInteractionStateParams = {}) {
	const [state, setState] = useState<TInteractionState>(() => getDefaultState(initialState));

	const updateInteraction = useCallback((interaction: Partial<TInteractionState>) => {
		setState((prev) => ({ ...prev, ...interaction }));
	}, []);

	const redefineState = useCallback((nextState: TInteractionState) => {
		setState(nextState);
	}, []);

	const resetState = useCallback(() => {
		setState(getDefaultState());
	}, []);

	return {
		state,
		updateInteraction,
		redefineState,
		resetState,
	};
}

export type TUseInternalInteractionState = ReturnType<typeof useInternalInteractionState>;
