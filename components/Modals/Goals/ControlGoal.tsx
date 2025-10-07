import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateForInputValue, formatDateOnInputChange, formatNameAsInitials } from "@/lib/formatting";
import { updateGoal as updateGoalMutation } from "@/lib/mutations/goals";
import { useGoalById } from "@/lib/queries/goals";
import { useSellers } from "@/lib/queries/sellers";
import { type TUseGoalsState, useGoalsState } from "@/lib/states/goals";
import type { TGetSellersOutputDefault } from "@/pages/api/sellers";
import type { TUserSession } from "@/schemas/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, UsersRound } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import GoalGeneral from "./Blocks/General";
import GoalSellers from "./Blocks/Sellers";

type ControlGoalProps = {
	goalId: string;
	session: TUserSession;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlGoal({ goalId, session, closeModal, callbacks }: ControlGoalProps) {
	const queryClient = useQueryClient();

	const { data: goal, queryKey, isLoading, isError, isSuccess, error } = useGoalById({ id: goalId });
	const { state, updateGoal, addGoalSeller, updateGoalSeller, deleteGoalSeller, updateManyGoalSellers, redefineState } = useGoalsState({});

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
			<GoalGeneral goal={state.goal} updateGoal={updateGoal} goalSellers={state.goalSellers} />
			<GoalSellers
				goalTotalValue={state.goal.objetivoValor}
				goalSellers={state.goalSellers}
				updateGoalSeller={updateGoalSeller}
				updateManyGoalSellers={updateManyGoalSellers}
			/>
		</ResponsiveMenu>
	);
}
