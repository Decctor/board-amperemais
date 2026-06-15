import { TAuthUserSession } from "@/lib/authentication/types";
import { useCashbackProgramPrizeById } from "@/lib/queries/cashback-programs";
import { useCashbackProgramPrizeState } from "@/state-hooks/use-cashback-program-state";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { useMutation } from "@tanstack/react-query";
import { updateCashbackProgramPrize as updateCashbackProgramPrizeMutation } from "@/lib/mutations/cashback-programs";
import { getErrorMessage } from "@/lib/errors";
import CashbackProgramsPrizesGeneralBlock from "./Blocks/General";
import { useEffect } from "react";
import { toast } from "sonner";

type ControlCashbackProgramPrizeProps = {
	user: TAuthUserSession["user"];
	userOrg: Exclude<TAuthUserSession["membership"], null>["organizacao"];
	cashbackProgramId: string;
	cashbackProgramPrizeId: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlCashbackProgramPrize({
	user: _user,
	userOrg: _userOrg,
	cashbackProgramId: _cashbackProgramId,
	cashbackProgramPrizeId,
	closeMenu,
	callbacks,
}: ControlCashbackProgramPrizeProps) {
	const { data: cashbackProgramPrize, isLoading, error } = useCashbackProgramPrizeById({ id: cashbackProgramPrizeId });

	const { state, updateCashbackProgramPrize, redefineState } = useCashbackProgramPrizeState({});

	const { mutate: handleUpdateCashbackProgramPrizeMutation, isPending } = useMutation({
		mutationKey: ["update-cashback-program-prize"],
		mutationFn: updateCashbackProgramPrizeMutation,
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

	useEffect(() => {
		if (cashbackProgramPrize)
			redefineState({
				...cashbackProgramPrize,
				produto: cashbackProgramPrize.produto
					? {
							id: cashbackProgramPrize.produto.id,
							nome: cashbackProgramPrize.produto.nome,
						}
					: cashbackProgramPrize.produtoVariante
						? {
								id: cashbackProgramPrize.produtoVariante.id,
								nome: cashbackProgramPrize.produtoVariante.nome,
							}
						: null,
			});
	}, [cashbackProgramPrize, redefineState]);

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PRÊMIO"
			menuDescription="Preencha os campos abaixo para editar o prêmio"
			menuActionButtonText="ATUALIZAR PRÊMIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleUpdateCashbackProgramPrizeMutation({ cashbackProgramPrizeId, cashbackProgramPrize: state })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeMenu}
		>
			<CashbackProgramsPrizesGeneralBlock
				state={state}
				updateCashbackProgramPrize={updateCashbackProgramPrize}
				cashbackProgramTerminology={cashbackProgramPrize?.programa.terminologia ?? "DINHEIRO"}
			/>
		</ResponsiveMenu>
	);
}
