import { ProductionRecipeBaseSchema, ProductionRecipeInputSchema, ProductionRecipeOutputBaseSchema } from "@/schemas/productions";
import { useCallback, useState } from "react";
import { z } from "zod";

const ProductionRecipeStateSchema = z.object({
	productionRecipe: ProductionRecipeBaseSchema.omit({ organizacaoId: true, dataInsercao: true }),
	productionRecipeInputs: z.array(
		ProductionRecipeInputSchema.omit({ organizacaoId: true, receitaId: true }).extend({
			id: z.string().optional().nullable(),
			deletar: z.boolean().optional().nullable(),
			produto: z
				.object({
					id: z.string(),
					nome: z.string(),
					codigo: z.string().nullable().optional(),
					imagemCapaUrl: z.string().nullable().optional(),
				})
				.optional()
				.nullable(),
			produtoVariante: z
				.object({
					id: z.string(),
					nome: z.string(),
					codigo: z.string().nullable().optional(),
					imagemCapaUrl: z.string().nullable().optional(),
				})
				.optional()
				.nullable(),
		}),
	),
	productionRecipeOutputs: z.array(
		ProductionRecipeOutputBaseSchema.omit({ organizacaoId: true, receitaId: true }).extend({
			id: z.string().optional().nullable(),
			deletar: z.boolean().optional().nullable(),
			produto: z
				.object({
					id: z.string(),
					nome: z.string(),
					codigo: z.string().nullable().optional(),
					imagemCapaUrl: z.string().nullable().optional(),
				})
				.optional()
				.nullable(),
			produtoVariante: z
				.object({
					id: z.string(),
					nome: z.string(),
					codigo: z.string().nullable().optional(),
					imagemCapaUrl: z.string().nullable().optional(),
				})
				.optional()
				.nullable(),
		}),
	),
});

export type TProductionRecipeState = z.infer<typeof ProductionRecipeStateSchema>;

type UseInternalProductionRecipeStateProps = {
	initialState?: Partial<TProductionRecipeState>;
};

const DEFAULT_RECIPE: TProductionRecipeState["productionRecipe"] = {
	titulo: "",
	descricao: null,
	previsaoTempoMedida: null,
	previsaoTempoValor: null,
	ativo: true,
};

export function useInternalProductionRecipeState({ initialState }: UseInternalProductionRecipeStateProps) {
	const [state, setState] = useState<TProductionRecipeState>({
		productionRecipe: {
			...DEFAULT_RECIPE,
			...initialState?.productionRecipe,
		},
		productionRecipeInputs: initialState?.productionRecipeInputs ?? [],
		productionRecipeOutputs: initialState?.productionRecipeOutputs ?? [],
	});

	const updateProductionRecipe = useCallback((productionRecipe: Partial<TProductionRecipeState["productionRecipe"]>) => {
		setState((prev) => ({
			...prev,
			productionRecipe: { ...prev.productionRecipe, ...productionRecipe },
		}));
	}, []);

	const addProductionRecipeInput = useCallback((input: TProductionRecipeState["productionRecipeInputs"][number]) => {
		setState((prev) => ({
			...prev,
			productionRecipeInputs: [...prev.productionRecipeInputs, input],
		}));
	}, []);

	const updateProductionRecipeInput = useCallback((index: number, input: Partial<TProductionRecipeState["productionRecipeInputs"][number]>) => {
		setState((prev) => ({
			...prev,
			productionRecipeInputs: prev.productionRecipeInputs.map((current, currentIndex) => (currentIndex === index ? { ...current, ...input } : current)),
		}));
	}, []);

	const removeProductionRecipeInput = useCallback((index: number) => {
		setState((prev) => {
			const target = prev.productionRecipeInputs[index];
			if (!target?.id) {
				return {
					...prev,
					productionRecipeInputs: prev.productionRecipeInputs.filter((_, currentIndex) => currentIndex !== index),
				};
			}
			return {
				...prev,
				productionRecipeInputs: prev.productionRecipeInputs.map((current, currentIndex) =>
					currentIndex === index ? { ...current, deletar: true } : current,
				),
			};
		});
	}, []);

	const addProductionRecipeOutput = useCallback((output: TProductionRecipeState["productionRecipeOutputs"][number]) => {
		setState((prev) => ({
			...prev,
			productionRecipeOutputs: [...prev.productionRecipeOutputs, output],
		}));
	}, []);

	const updateProductionRecipeOutput = useCallback((index: number, output: Partial<TProductionRecipeState["productionRecipeOutputs"][number]>) => {
		setState((prev) => ({
			...prev,
			productionRecipeOutputs: prev.productionRecipeOutputs.map((current, currentIndex) =>
				currentIndex === index ? { ...current, ...output } : current,
			),
		}));
	}, []);

	const removeProductionRecipeOutput = useCallback((index: number) => {
		setState((prev) => {
			const target = prev.productionRecipeOutputs[index];
			if (!target?.id) {
				return {
					...prev,
					productionRecipeOutputs: prev.productionRecipeOutputs.filter((_, currentIndex) => currentIndex !== index),
				};
			}
			return {
				...prev,
				productionRecipeOutputs: prev.productionRecipeOutputs.map((current, currentIndex) =>
					currentIndex === index ? { ...current, deletar: true } : current,
				),
			};
		});
	}, []);

	const redefineState = useCallback((newState: TProductionRecipeState) => {
		setState(newState);
	}, []);

	const resetState = useCallback(() => {
		setState({
			productionRecipe: DEFAULT_RECIPE,
			productionRecipeInputs: [],
			productionRecipeOutputs: [],
		});
	}, []);

	return {
		state,
		updateProductionRecipe,
		addProductionRecipeInput,
		updateProductionRecipeInput,
		removeProductionRecipeInput,
		addProductionRecipeOutput,
		updateProductionRecipeOutput,
		removeProductionRecipeOutput,
		redefineState,
		resetState,
	};
}

export type TUseInternalProductionRecipeState = ReturnType<typeof useInternalProductionRecipeState>;
