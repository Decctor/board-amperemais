import { FiscalSeriesSchema } from "@/schemas/fiscal";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const FiscalSeriesStateSchema = z.object({
	fiscalSeries: FiscalSeriesSchema.omit({
		organizacaoId: true,
		dataInsercao: true,
	}),
});
export type TFiscalSeriesState = z.infer<typeof FiscalSeriesStateSchema>;

type TUseFiscalSeriesStateProps = {
	initialState?: Partial<TFiscalSeriesState>;
};

export function useFiscalSeriesState({ initialState }: TUseFiscalSeriesStateProps) {
	const initialStateHolder = useMemo<TFiscalSeriesState>(() => {
		return {
			fiscalSeries: {
				tipoDocumento: initialState?.fiscalSeries?.tipoDocumento ?? "NFCE",
				ambiente: initialState?.fiscalSeries?.ambiente ?? "HOMOLOGACAO",
				serie: initialState?.fiscalSeries?.serie ?? "",
				proximoNumero: initialState?.fiscalSeries?.proximoNumero ?? 1,
				ativo: initialState?.fiscalSeries?.ativo ?? true,
			},
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [state, setState] = useState<TFiscalSeriesState>(initialStateHolder);

	const updateFiscalSeries = useCallback((patch: Partial<TFiscalSeriesState["fiscalSeries"]>) => {
		setState((prev) => ({
			...prev,
			fiscalSeries: { ...prev.fiscalSeries, ...patch },
		}));
	}, []);

	const redefineState = useCallback((nextState: TFiscalSeriesState) => {
		setState(nextState);
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	return {
		state,
		updateFiscalSeries,
		redefineState,
		resetState,
	};
}

export type TUseFiscalSeriesState = ReturnType<typeof useFiscalSeriesState>;
