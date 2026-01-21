import { CashbackProgramSchema } from "@/schemas/cashback-programs";
import { useCallback, useState } from "react";
import z from "zod";

const CashbackProgramStateSchema = z.object({
	cashbackProgram: CashbackProgramSchema.omit({ dataInsercao: true, dataAtualizacao: true }),
});
type TCashbackProgramState = z.infer<typeof CashbackProgramStateSchema>;

export function useCashbackProgramState() {
	const [state, setState] = useState<TCashbackProgramState>({
		cashbackProgram: {
			ativo: true,
			titulo: "",
			descricao: "",
			acumuloTipo: "FIXO",
			acumuloValor: 0,
			acumuloRegraValorMinimo: 0,
			expiracaoRegraValidadeValor: 0,
			resgateLimiteTipo: null,
			resgateLimiteValor: null,
		},
	});

	const updateCashbackProgram = useCallback((cashbackProgram: Partial<TCashbackProgramState["cashbackProgram"]>) => {
		setState((prev) => ({
			...prev,
			cashbackProgram: { ...prev.cashbackProgram, ...cashbackProgram },
		}));
	}, []);

	const resetState = useCallback(() => {
		setState({
			cashbackProgram: {
				ativo: true,
				titulo: "",
				descricao: "",
				acumuloTipo: "FIXO",
				acumuloValor: 0,
				acumuloRegraValorMinimo: 0,
				expiracaoRegraValidadeValor: 0,
				resgateLimiteTipo: null,
				resgateLimiteValor: null,
			},
		});
	}, []);

	const redefineState = useCallback((state: TCashbackProgramState) => {
		setState(state);
	}, []);
	return {
		state,
		updateCashbackProgram,
		resetState,
		redefineState,
	};
}
export type TUseCashbackProgramState = ReturnType<typeof useCashbackProgramState>;
