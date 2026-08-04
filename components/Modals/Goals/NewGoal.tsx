import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { findOverlappingGoals } from "@/lib/goals/periods";
import { createGoal } from "@/lib/mutations/goals";
import { useGoals } from "@/lib/queries/goals";
import { useGoalsState } from "@/state-hooks/use-goal-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import GoalGeneral from "./Blocks/General";
import GoalSellersTable from "./Blocks/SellersTable";

type NewGoalProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewGoal({ user, closeModal, callbacks }: NewGoalProps) {
	const queryClient = useQueryClient();
	const {
		state,
		updateGoal,
		addGoalSeller,
		updateGoalSeller,
		updateManyGoalSellers,
		removeGoalSellerByVendedorId,
		restoreGoalSeller,
		resetState,
	} = useGoalsState({});

	// A checagem de sobreposição olha as metas mais recentes da organização. É um aviso, não uma
	// trava, então a primeira página basta: metas novas nascem perto de hoje.
	const { data: existingGoals } = useGoals({ page: 1 });
	const overlappingGoals = findOverlappingGoals({
		goals: existingGoals?.goals ?? [],
		range: { dataInicio: state.goal.dataInicio, dataFim: state.goal.dataFim },
	});

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
