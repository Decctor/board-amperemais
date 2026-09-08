import type { TOpenSalesSessionInput } from "@/schemas/sales-sessions";
import { useCallback, useState } from "react";

type TSalesSessionOpenState = {
	openInput: TOpenSalesSessionInput;
};

const getInitialState = (initialState?: Partial<TOpenSalesSessionInput>): TSalesSessionOpenState => ({
	openInput: {
		contaFinanceiraId: initialState?.contaFinanceiraId ?? null,
		politica: initialState?.politica ?? "VENDEDORES_MULTIPLOS",
		vendedorPadraoId: initialState?.vendedorPadraoId ?? null,
		saldoInicial: initialState?.saldoInicial ?? 0,
		observacoesAbertura: initialState?.observacoesAbertura ?? null,
	},
});

export function useInternalSalesSessionState({ initialState }: { initialState?: Partial<TOpenSalesSessionInput> } = {}) {
	const [state, setState] = useState<TSalesSessionOpenState>(getInitialState(initialState));

	const updateOpenInput = useCallback((changes: Partial<TOpenSalesSessionInput>) => {
		setState((prev) => ({ ...prev, openInput: { ...prev.openInput, ...changes } }));
	}, []);

	const resetState = useCallback(() => {
		setState(getInitialState());
	}, []);

	const redefineState = useCallback((next: TSalesSessionOpenState) => {
		setState(next);
	}, []);

	return { state, updateOpenInput, resetState, redefineState };
}

export type TUseInternalSalesSessionState = ReturnType<typeof useInternalSalesSessionState>;
