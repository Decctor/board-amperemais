import { FiscalOperationProfileSchema } from "@/schemas/fiscal";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const FiscalOperationProfileStateSchema = z.object({
	fiscalOperationProfile: FiscalOperationProfileSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});
export type TFiscalOperationProfileState = z.infer<typeof FiscalOperationProfileStateSchema>;

type TUseFiscalOperationProfileStateProps = {
	initialState?: Partial<TFiscalOperationProfileState>;
};

export function useFiscalOperationProfileState({ initialState }: TUseFiscalOperationProfileStateProps) {
	const initialStateHolder = useMemo<TFiscalOperationProfileState>(() => {
		return {
			fiscalOperationProfile: {
				nome: initialState?.fiscalOperationProfile?.nome ?? "",
				descricao: initialState?.fiscalOperationProfile?.descricao ?? "",
				tipoDocumento: initialState?.fiscalOperationProfile?.tipoDocumento ?? "NFCE",
				finalidade: initialState?.fiscalOperationProfile?.finalidade ?? "NORMAL",
				presencaConsumidor: initialState?.fiscalOperationProfile?.presencaConsumidor ?? "OPERACAO_PRESENCIAL",
				consumidorFinal: initialState?.fiscalOperationProfile?.consumidorFinal ?? true,
				cfopPadrao: initialState?.fiscalOperationProfile?.cfopPadrao ?? "",
				naturezaOperacao: initialState?.fiscalOperationProfile?.naturezaOperacao ?? "",
				seriePadraoId: initialState?.fiscalOperationProfile?.seriePadraoId ?? null,
				ativo: initialState?.fiscalOperationProfile?.ativo ?? true,
			},
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [state, setState] = useState<TFiscalOperationProfileState>(initialStateHolder);

	const updateFiscalOperationProfile = useCallback(
		(patch: Partial<TFiscalOperationProfileState["fiscalOperationProfile"]>) => {
			setState((prev) => ({
				...prev,
				fiscalOperationProfile: { ...prev.fiscalOperationProfile, ...patch },
			}));
		},
		[],
	);

	const redefineState = useCallback((nextState: TFiscalOperationProfileState) => {
		setState(nextState);
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	return {
		state,
		updateFiscalOperationProfile,
		redefineState,
		resetState,
	};
}

export type TUseFiscalOperationProfileState = ReturnType<typeof useFiscalOperationProfileState>;
