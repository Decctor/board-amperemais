"use client";

import FinancialAccountForm from "@/components/Modals/Finances/FinancialAccounts/Blocks/FinancialAccountForm";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateFinancialAccount } from "@/lib/mutations/finances";
import { useFinancialAccountById } from "@/lib/queries/finances";
import { useInternalFinancialAccountState } from "@/state-hooks/use-internal-financial-account-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

type ControlFinancialAccountProps = {
	accountId: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ControlFinancialAccount({ accountId, closeMenu, callbacks }: ControlFinancialAccountProps) {
	const queryClient = useQueryClient();
	const { data: account, isLoading, isError, error } = useFinancialAccountById(accountId);
	const { state, updateState, updateConfiguration, updateType, redefineState, getUpdatePayload } = useInternalFinancialAccountState({
		initialState: { id: accountId },
	});

	useEffect(() => {
		if (!account) return;
		redefineState({
			id: account.id,
			chaveSistema: account.chaveSistema,
			nome: account.nome,
			descricao: account.descricao,
			tipo: account.tipo,
			moeda: account.moeda,
			ativo: account.ativo,
			contaContabilId: account.contaContabilId,
			saldoInicial: account.saldoInicial,
			dataSaldoInicial: new Date(account.dataSaldoInicial),
			configuracao: account.configuracao,
		});
	}, [account, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-financial-account", accountId],
		mutationFn: updateFinancialAccount,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			void queryClient.invalidateQueries({ queryKey: ["finances-financial-accounts"] });
			void queryClient.invalidateQueries({ queryKey: ["finances-financial-account-by-id", accountId] });
			closeMenu();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR CONTA FINANCEIRA"
			menuDescription="Atualize os dados e as regras específicas da conta financeira."
			menuActionButtonText="SALVAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(getUpdatePayload())}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeMenu}
			dialogVariant="md"
			drawerVariant="lg"
		>
			<FinancialAccountForm
				state={state}
				updateState={updateState}
				updateConfiguration={updateConfiguration}
				updateType={updateType}
				allowTypeChange={!state.chaveSistema}
			/>
		</ResponsiveMenu>
	);
}
