"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import FinancialAccountForm from "@/components/Modals/Finances/FinancialAccounts/Blocks/FinancialAccountForm";
import { getErrorMessage } from "@/lib/errors";
import { createFinancialAccount } from "@/lib/mutations/finances";
import { useInternalFinancialAccountState } from "@/state-hooks/use-internal-financial-account-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";

type NewFinancialAccountProps = {
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function NewFinancialAccount({ closeMenu, callbacks }: NewFinancialAccountProps) {
	const queryClient = useQueryClient();
	const { state, updateState, updateConfiguration, updateType, getCreatePayload } = useInternalFinancialAccountState();

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-financial-account"],
		mutationFn: createFinancialAccount,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			void queryClient.invalidateQueries({ queryKey: ["finances-financial-accounts"] });
			void queryClient.invalidateQueries({ queryKey: ["finances-financial-account-by-id"] });
			closeMenu();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVA CONTA FINANCEIRA"
			menuDescription="Cadastre uma conta, cartão ou carteira para controlar seus recursos financeiros."
			menuActionButtonText="CRIAR CONTA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(getCreatePayload())}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
			dialogVariant="md"
			drawerVariant="lg"
		>
			<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
				<WalletCards className="h-4 w-4 text-primary" />
				<span>Configure os dados específicos do tipo escolhido, como fechamento e vencimento de cartão.</span>
			</div>
			<FinancialAccountForm state={state} updateState={updateState} updateConfiguration={updateConfiguration} updateType={updateType} />
		</ResponsiveMenu>
	);
}
