"use client";

import AccountingEntryAccountsBlock from "@/components/Modals/AccountingEntries/Blocks/Accounts";
import AccountingEntryFinancialTransactionsBlock from "@/components/Modals/AccountingEntries/Blocks/FinancialTransactions";
import AccountingEntryGeneralBlock from "@/components/Modals/AccountingEntries/Blocks/General";
import AccountingEntryValuesBlock from "@/components/Modals/AccountingEntries/Blocks/Values";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateAccountingEntry } from "@/lib/mutations/finances";
import { useAccountingEntryById } from "@/lib/queries/finances";
import { useInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

type ControlAccountingEntryProps = {
	entryId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ControlAccountingEntry({ entryId, closeModal, callbacks }: ControlAccountingEntryProps) {
	const queryClient = useQueryClient();
	const { data: entryData, isLoading, isError, error, queryKey } = useAccountingEntryById(entryId);
	const {
		state,
		updateEntry,
		addFinancialTransaction,
		updateFinancialTransaction,
		removeFinancialTransaction,
		redefineFinancialTransactions,
		redefineState,
		resetState,
	} = useInternalAccountingEntryState({ initialState: { entryId } });

	useEffect(() => {
		if (!entryData) return;
		redefineState({
			entryId: entryData.id,
			entry: {
				titulo: entryData.titulo,
				anotacoes: entryData.anotacoes,
				idContaDebito: entryData.idContaDebito,
				idContaCredito: entryData.idContaCredito,
				valor: entryData.valor,
				valorPrevisto: entryData.valorPrevisto,
				dataCompetencia: entryData.dataCompetencia,
			},
			entryFinancialTransactions: entryData.transacoesFinanceiras.map((transaction) => ({
				id: transaction.id,
				deletar: false,
				contaFinanceiraId: transaction.contaFinanceiraId,
				titulo: transaction.titulo,
				tipo: transaction.tipo,
				valor: transaction.valor,
				metodo: transaction.metodo,
				dataPrevisao: transaction.dataPrevisao,
				dataEfetivacao: transaction.dataEfetivacao,
				parcela: transaction.parcela,
				totalParcelas: transaction.totalParcelas,
			})),
		});
	}, [entryData, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-accounting-entry", entryId],
		mutationFn: updateAccountingEntry,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			resetState();
			void queryClient.invalidateQueries({ queryKey: ["finances-accounting-entries"] });
			void queryClient.invalidateQueries({ queryKey });
			closeModal();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError as Error);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR LANÇAMENTO CONTÁBIL"
			menuDescription="Ajuste os dados do lançamento e suas transações financeiras vinculadas."
			menuActionButtonText="SALVAR LANÇAMENTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
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
