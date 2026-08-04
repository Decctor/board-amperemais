import { resolveDefaultGoalPeriod } from "@/lib/goals/periods";
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
	// Uma meta nasce cobrindo o mês corrente. O padrão anterior era `new Date()` nas duas pontas: um
	// intervalo de duração zero, que nenhuma checagem de "meta ativa" consegue satisfazer.
	const defaultPeriod = resolveDefaultGoalPeriod();

	const [state, setState] = useState<TGoalsState>({
		goal: {
			dataInicio: initialState?.goal?.dataInicio ?? defaultPeriod.dataInicio,
			dataFim: initialState?.goal?.dataFim ?? defaultPeriod.dataFim,
			objetivoValor: initialState?.goal?.objetivoValor ?? 0,
			objetivoQtdeVendas: initialState?.goal?.objetivoQtdeVendas ?? null,
			objetivoNovosClientes: initialState?.goal?.objetivoNovosClientes ?? null,
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
	/** Remove pelo id do vendedor. A tabela pensa em vendedor, não em posição de array. */
	function removeGoalSellerByVendedorId(vendedorId: string) {
		setState((prev) => ({
			...prev,
			goalSellers: prev.goalSellers.flatMap((seller) => {
				if (seller.vendedorId !== vendedorId) return [seller];
				// Linha já persistida vira soft-delete; linha nova simplesmente sai.
				return seller.id ? [{ ...seller, deletar: true }] : [];
			}),
		}));
	}

	/** Desfaz uma remoção: linha persistida perde a flag, linha nova é reinserida. */
	function restoreGoalSeller(goalSeller: TGoalsState["goalSellers"][number]) {
		setState((prev) => {
			const exists = prev.goalSellers.some((seller) => seller.vendedorId === goalSeller.vendedorId);
			if (!exists) return { ...prev, goalSellers: [...prev.goalSellers, { ...goalSeller, deletar: false }] };
			return {
				...prev,
				goalSellers: prev.goalSellers.map((seller) => (seller.vendedorId === goalSeller.vendedorId ? { ...seller, deletar: false } : seller)),
			};
		});
	}

	function resetState() {
		const period = resolveDefaultGoalPeriod();
		setState({
			goal: {
				dataInicio: period.dataInicio,
				dataFim: period.dataFim,
				objetivoValor: 0,
				objetivoQtdeVendas: null,
				objetivoNovosClientes: null,
			},
			goalSellers: [],
		});
	}
	function redefineState(state: TGoalsState) {
		setState(state);
	}
	return {
		state,
		updateGoal,
		addGoalSeller,
		updateGoalSeller,
		removeGoalSellerByVendedorId,
		restoreGoalSeller,
		updateManyGoalSellers,
		resetState,
		redefineState,
	};
}
export type TUseGoalsState = ReturnType<typeof useGoalsState>;
