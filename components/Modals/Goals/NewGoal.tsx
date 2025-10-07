import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateForInputValue, formatDateOnInputChange, formatNameAsInitials } from "@/lib/formatting";
import { createGoal } from "@/lib/mutations/goals";
import { useSellers } from "@/lib/queries/sellers";
import { type TUseGoalsState, useGoalsState } from "@/lib/states/goals";
import type { TGetSellersOutputDefault } from "@/pages/api/sellers";
import type { TUserSession } from "@/schemas/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, UsersRound } from "lucide-react";
import { toast } from "sonner";
import GoalGeneral from "./Blocks/General";
import GoalSellers from "./Blocks/Sellers";

type NewGoalProps = {
	session: TUserSession;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewGoal({ session, closeModal, callbacks }: NewGoalProps) {
	const queryClient = useQueryClient();
	const { state, updateGoal, addGoalSeller, updateGoalSeller, deleteGoalSeller, updateManyGoalSellers, resetState } = useGoalsState({});

	const { mutate: handleCreateGoalMutation, isPending } = useMutation({
		mutationKey: ["create-goal"],
		mutationFn: createGoal,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});
	return (
		<ResponsiveMenu
			menuTitle="NOVA META"
			menuDescription="Preencha os campos abaixo para criar uma nova meta"
			menuActionButtonText="CRIAR META"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateGoalMutation(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
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
