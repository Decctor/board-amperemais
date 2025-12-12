import { GoalSchema, GoalSellerSchema } from "@/schemas/goals";
import { SellerSchema } from "@/schemas/sellers";
import { useState } from "react";
import { z } from "zod";

const GoalsStateSchema = z.object({
	goal: GoalSchema.omit({ dataInsercao: true }),
	goalSellers: z.array(
		GoalSellerSchema.omit({ metaId: true }).extend({
			vendedor: SellerSchema.pick({
				nome: true,
				avatarUrl: true,
				telefone: true,
				email: true,
			}),
			id: z
				.string({
					required_error: "ID da meta do vendedor não informado.",
					invalid_type_error: "Tipo inválido para ID da meta do vendedor.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar meta do vendedor não informado.",
					invalid_type_error: "Tipo inválido para deletar meta do vendedor.",
				})
				.optional(),
		}),
	),
});
type TGoalsState = z.infer<typeof GoalsStateSchema>;

type TUseGoalsStateProps = {
	initialState?: Partial<TGoalsState>;
};
export function useGoalsState({ initialState }: TUseGoalsStateProps) {
	const [state, setState] = useState<TGoalsState>({
		goal: {
			dataInicio: initialState?.goal?.dataInicio ?? new Date(),
			dataFim: initialState?.goal?.dataFim ?? new Date(),
			objetivoValor: initialState?.goal?.objetivoValor ?? 0,
		},
		goalSellers: initialState?.goalSellers ?? [],
	});

	function updateGoal(goal: Partial<TGoalsState["goal"]>) {
		setState((prev) => ({
			...prev,
			goal: { ...prev.goal, ...goal },
		}));
	}
	function addGoalSeller(goalSeller: TGoalsState["goalSellers"][number]) {
		setState((prev) => ({
			...prev,
			goalSellers: [...prev.goalSellers, goalSeller],
		}));
	}
	function updateGoalSeller(info: TUseGoalsState["state"]["goalSellers"][number]) {
		const isExistingGoalSeller = state.goalSellers.find((seller) => seller.vendedorId === info.vendedorId);
		if (!isExistingGoalSeller) return addGoalSeller({ ...info });

		setState((prev) => ({
			...prev,
			goalSellers: prev.goalSellers.map((seller) => (seller.vendedorId === info.vendedorId ? { ...seller, ...info } : seller)),
		}));
	}
	function updateManyGoalSellers(info: TUseGoalsState["state"]["goalSellers"][number][]) {
		setState((prev) => ({
			...prev,
			goalSellers: info,
		}));
	}
	function deleteGoalSeller(index: number) {
		// Validating existence (id defined)
		const isExistingGoalSeller = state.goalSellers.find((c, gsId) => index === gsId && !!c.id);
		if (!isExistingGoalSeller)
			// If not an existing instance, just filtering it out
			return setState((prev) => ({ ...prev, goalSellers: prev.goalSellers.filter((_, gsId) => index !== gsId) }));
		// Else, marking it with a deletar flag
		return setState((prev) => ({
			...prev,
			goalSellers: prev.goalSellers.map((item, gsId) => (index === gsId ? { ...item, deletar: true } : item)),
		}));
	}

	function resetState() {
		setState({
			goal: {
				dataInicio: new Date(),
				dataFim: new Date(),
				objetivoValor: 0,
			},
			goalSellers: [],
		});
	}
	function redefineState(state: TGoalsState) {
		setState(state);
	}
	return { state, updateGoal, addGoalSeller, updateGoalSeller, deleteGoalSeller, updateManyGoalSellers, resetState, redefineState };
}
export type TUseGoalsState = ReturnType<typeof useGoalsState>;
