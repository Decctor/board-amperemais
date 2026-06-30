import type { TCreateProductionInput } from "@/app/api/productions/route";
import { useCallback, useState } from "react";

type ProductionProductSnapshot = {
	id: string;
	nome: string;
	codigo: string | null;
	unidade: string | null;
	imagemCapaUrl: string | null;
};

type ProductionVariantSnapshot = {
	id: string;
	nome: string;
	codigo: string | null;
	imagemCapaUrl: string | null;
};

type ProductionInputState = TCreateProductionInput["productionInputs"][number] & {
	id?: string | null;
	deletar?: boolean | null;
	produto?: ProductionProductSnapshot | null;
	produtoVariante?: ProductionVariantSnapshot | null;
};

type ProductionOutputState = TCreateProductionInput["productionOutputs"][number] & {
	id?: string | null;
	deletar?: boolean | null;
	produto?: ProductionProductSnapshot | null;
	produtoVariante?: ProductionVariantSnapshot | null;
};

export type TProductionState = {
	production: TCreateProductionInput["production"];
	productionInputs: ProductionInputState[];
	productionOutputs: ProductionOutputState[];
};

const DEFAULT_PRODUCTION: TProductionState["production"] = {
	receitaId: null,
	titulo: "",
	origem: "MANUAL",
	status: "RASCUNHO",
	vendaId: null,
	vendaItemId: null,
	dataInicio: null,
	dataPrevisaoConclusao: null,
	dataConclusao: null,
	observacoes: null,
};

const DEFAULT_STATE: TProductionState = {
	production: DEFAULT_PRODUCTION,
	productionInputs: [],
	productionOutputs: [],
};

type UseInternalProductionStateParams = {
	initialState: Partial<TProductionState>;
};

export function useInternalProductionState({ initialState }: UseInternalProductionStateParams) {
	const [state, setState] = useState<TProductionState>({
		production: { ...DEFAULT_PRODUCTION, ...initialState.production },
		productionInputs: initialState.productionInputs ?? DEFAULT_STATE.productionInputs,
		productionOutputs: initialState.productionOutputs ?? DEFAULT_STATE.productionOutputs,
	});

	const updateProduction = useCallback((newProduction: Partial<TProductionState["production"]>) => {
		setState((prev) => ({
			...prev,
			production: { ...prev.production, ...newProduction },
		}));
	}, []);

	const addProductionInput = useCallback((input: ProductionInputState) => {
		setState((prev) => ({
			...prev,
			productionInputs: [...prev.productionInputs, input],
		}));
	}, []);

	const updateProductionInput = useCallback((index: number, input: Partial<ProductionInputState>) => {
		setState((prev) => ({
			...prev,
			productionInputs: prev.productionInputs.map((currentInput, currentIndex) =>
				currentIndex === index ? { ...currentInput, ...input } : currentInput,
			),
		}));
	}, []);

	const removeProductionInput = useCallback((index: number) => {
		setState((prev) => {
			const input = prev.productionInputs[index];
			if (!input) return prev;
			if (!input.id) {
				return {
					...prev,
					productionInputs: prev.productionInputs.filter((_, currentIndex) => currentIndex !== index),
				};
			}
			return {
				...prev,
				productionInputs: prev.productionInputs.map((currentInput, currentIndex) =>
					currentIndex === index ? { ...currentInput, deletar: true } : currentInput,
				),
			};
		});
	}, []);

	const addProductionOutput = useCallback((output: ProductionOutputState) => {
		setState((prev) => ({
			...prev,
			productionOutputs: [...prev.productionOutputs, output],
		}));
	}, []);

	const updateProductionOutput = useCallback((index: number, output: Partial<ProductionOutputState>) => {
		setState((prev) => ({
			...prev,
			productionOutputs: prev.productionOutputs.map((currentOutput, currentIndex) =>
				currentIndex === index ? { ...currentOutput, ...output } : currentOutput,
			),
		}));
	}, []);

	const removeProductionOutput = useCallback((index: number) => {
		setState((prev) => {
			const output = prev.productionOutputs[index];
			if (!output) return prev;
			if (!output.id) {
				return {
					...prev,
					productionOutputs: prev.productionOutputs.filter((_, currentIndex) => currentIndex !== index),
				};
			}
			return {
				...prev,
				productionOutputs: prev.productionOutputs.map((currentOutput, currentIndex) =>
					currentIndex === index ? { ...currentOutput, deletar: true } : currentOutput,
				),
			};
		});
	}, []);

	const redefineState = useCallback((newState: Partial<TProductionState>) => {
		setState({
			production: { ...DEFAULT_PRODUCTION, ...newState.production },
			productionInputs: newState.productionInputs ?? [],
			productionOutputs: newState.productionOutputs ?? [],
		});
	}, []);

	const resetState = useCallback(() => {
		setState(DEFAULT_STATE);
	}, []);

	return {
		state,
		updateProduction,
		addProductionInput,
		updateProductionInput,
		removeProductionInput,
		addProductionOutput,
		updateProductionOutput,
		removeProductionOutput,
		redefineState,
		resetState,
	};
}

export type TUseInternalProductionState = ReturnType<typeof useInternalProductionState>;
