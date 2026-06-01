"use client";

import AccountingEntryAccountsBlock from "@/components/Modals/AccountingEntries/Blocks/Accounts";
import AccountingEntryFinancialTransactionsBlock from "@/components/Modals/AccountingEntries/Blocks/FinancialTransactions";
import AccountingEntryGeneralBlock from "@/components/Modals/AccountingEntries/Blocks/General";
import AccountingEntryValuesBlock from "@/components/Modals/AccountingEntries/Blocks/Values";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createAccountingEntry } from "@/lib/mutations/finances";
import { useInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type NewAccountingEntryProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function NewAccountingEntry({ closeModal, callbacks }: NewAccountingEntryProps) {
	const queryClient = useQueryClient();
	const {
		state,
		updateEntry,
		addFinancialTransaction,
		updateFinancialTransaction,
		removeFinancialTransaction,
		redefineFinancialTransactions,
		resetState,
		getCreatePayload,
	} = useInternalAccountingEntryState();

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-accounting-entry"],
		mutationFn: createAccountingEntry,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			resetState();
			void queryClient.invalidateQueries({ queryKey: ["finances-accounting-entries"] });
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO LANÇAMENTO CONTÁBIL"
			menuDescription="Preencha os dados do lançamento e, se necessário, vincule as transações financeiras."
			menuActionButtonText="CRIAR LANÇAMENTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(getCreatePayload())}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeModal}
			lockClose={isPending}
		>
			<AccountingEntryGeneralBlock entry={state.entry} updateEntry={updateEntry} />
			<AccountingEntryAccountsBlock entry={state.entry} updateEntry={updateEntry} />
			<AccountingEntryValuesBlock entry={state.entry} updateEntry={updateEntry} />
			<AccountingEntryFinancialTransactionsBlock
				entryTotalValue={state.entry.valor}
				entryFinancialTransactions={state.entryFinancialTransactions}
				addFinancialTransaction={addFinancialTransaction}
				updateFinancialTransaction={updateFinancialTransaction}
				removeFinancialTransaction={removeFinancialTransaction}
				redefineFinancialTransactions={redefineFinancialTransactions}
			/>
		</ResponsiveMenu>
	);
}
