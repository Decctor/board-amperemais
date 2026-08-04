import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updateGoal as updateGoalMutation } from "@/lib/mutations/goals";
import { findOverlappingGoals } from "@/lib/goals/periods";
import { useGoalById, useGoals } from "@/lib/queries/goals";
import { useGoalsState } from "@/state-hooks/use-goal-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import GoalGeneral from "./Blocks/General";
import GoalSellersTable from "./Blocks/SellersTable";

type ControlGoalProps = {
	goalId: string;
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlGoal({ goalId, user, closeModal, callbacks }: ControlGoalProps) {
	const queryClient = useQueryClient();

	const { data: goal, queryKey, isLoading, isError, isSuccess, error } = useGoalById({ id: goalId });
	const {
		state,
		updateGoal,
		addGoalSeller,
		updateGoalSeller,
		updateManyGoalSellers,
		removeGoalSellerByVendedorId,
		restoreGoalSeller,
		redefineState,
	} = useGoalsState({});

	// A própria meta em edição não conta como sobreposição de si mesma.
	const { data: existingGoals } = useGoals({ page: 1 });
	const overlappingGoals = findOverlappingGoals({
		goals: existingGoals?.goals ?? [],
		range: { dataInicio: state.goal.dataInicio, dataFim: state.goal.dataFim },
		ignoreGoalId: goalId,
	});

	const { mutate: handleUpdateGoalMutation, isPending } = useMutation({
		mutationKey: ["update-goal"],
		mutationFn: updateGoalMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return queryClient.invalidateQueries({ queryKey });
		},
	});

	useEffect(() => {
		if (goal) redefineState({ goal: goal, goalSellers: goal.vendedores });
	}, [goal]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR META"
			menuDescription="Preencha os campos abaixo para atualizar a meta"
			menuActionButtonText="ATUALIZAR META"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleUpdateGoalMutation({ goalId: goalId, goal: state.goal, goalSellers: state.goalSellers })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<GoalGeneral goal={state.goal} updateGoal={updateGoal} overlappingGoals={overlappingGoals} />
			<GoalSellersTable
				objetivoValor={state.goal.objetivoValor}
				objetivoQtdeVendas={state.goal.objetivoQtdeVendas}
				objetivoNovosClientes={state.goal.objetivoNovosClientes}
				goalSellers={state.goalSellers}
				updateGoal={updateGoal}
				addGoalSeller={addGoalSeller}
				updateGoalSeller={updateGoalSeller}
				updateManyGoalSellers={updateManyGoalSellers}
				removeGoalSellerByVendedorId={removeGoalSellerByVendedorId}
				restoreGoalSeller={restoreGoalSeller}
			/>
		</ResponsiveMenu>
	);
}
