import { TAuthUserSession } from "@/lib/authentication/types";
import { useCashbackProgramPrizeState } from "@/state-hooks/use-cashback-program-state";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { useMutation } from "@tanstack/react-query";
import { createCashbackProgramPrize as createCashbackProgramPrizeMutation } from "@/lib/mutations/cashback-programs";
import { getErrorMessage } from "@/lib/errors";
import CashbackProgramsPrizesGeneralBlock from "./Blocks/General";
import { toast } from "sonner";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";

type NewCashbackProgramPrizeProps = {
	user: TAuthUserSession["user"];
	userOrg: Exclude<TAuthUserSession["membership"], null>["organizacao"];
	cashbackProgramId: string;
	cashbackProgramTerminology: TCashbackProgramTerminologyEnum;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewCashbackProgramPrize({
	user,
	userOrg,
	cashbackProgramId,
	cashbackProgramTerminology,
	closeMenu,
	callbacks,
}: NewCashbackProgramPrizeProps) {
	const { state, updateCashbackProgramPrize } = useCashbackProgramPrizeState({});

	const { mutate: handleCreateCashbackProgramPrizeMutation, isPending } = useMutation({
		mutationKey: ["create-cashback-program-prize"],
		mutationFn: createCashbackProgramPrizeMutation,
		onMutate: async () => {
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
			return closeMenu();
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO PRÊMIO"
			menuDescription="Preencha os campos abaixo para criar um novo prêmio"
			menuActionButtonText="CRIAR PRÊMIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateCashbackProgramPrizeMutation({ cashbackProgramId, cashbackProgramPrize: state })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
		>
			<CashbackProgramsPrizesGeneralBlock
				state={state}
				updateCashbackProgramPrize={updateCashbackProgramPrize}
				cashbackProgramTerminology={cashbackProgramTerminology}
			/>
		</ResponsiveMenu>
	);
}
