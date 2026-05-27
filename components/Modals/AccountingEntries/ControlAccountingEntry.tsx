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
import { AccountingEntryOriginTypeOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
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

	const originType = entryData?.origemTipo ?? "MANUAL";
	const originTypeConfig = AccountingEntryOriginTypeOptions.find((option) => option.value === originType);
	const canEditAccountingFields = originType === "MANUAL";
	const canEditTransactions = originType === "MANUAL" || originType === "VENDA";
	const canEditAnnotations = originType === "MANUAL" || originType === "VENDA" || originType === "ESTORNO";

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
			{entryData ? (
				<div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm">
					<div className="flex flex-wrap items-center gap-2">
						<Info className="h-4 w-4 text-muted-foreground" />
						<span className="font-medium">Origem do lançamento:</span>
						{originTypeConfig ? (
							<span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold">
								{originTypeConfig.icon}
								{originTypeConfig.label}
							</span>
						) : (
							<span className="text-xs font-semibold">{originType}</span>
						)}
					</div>
					{originType === "VENDA" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento foi gerado por uma venda. Os dados contábeis principais são controlados pela venda; por aqui você pode ajustar anotações e
							transações financeiras.
						</p>
					) : null}
					{originType === "ESTORNO" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento registra um estorno. Os dados contábeis e financeiros ficam em modo leitura; apenas anotações podem ser ajustadas.
						</p>
					) : null}
				</div>
			) : null}
			<AccountingEntryGeneralBlock
				entry={state.entry}
				updateEntry={updateEntry}
				titleEditable={canEditAccountingFields}
				competenceEditable={canEditAccountingFields}
				annotationsEditable={canEditAnnotations}
			/>
			<AccountingEntryAccountsBlock entry={state.entry} updateEntry={updateEntry} editable={canEditAccountingFields} />
			<AccountingEntryValuesBlock entry={state.entry} updateEntry={updateEntry} editable={canEditAccountingFields} />
			<AccountingEntryFinancialTransactionsBlock
				entryTotalValue={state.entry.valor}
				entryFinancialTransactions={state.entryFinancialTransactions}
				addFinancialTransaction={addFinancialTransaction}
				updateFinancialTransaction={updateFinancialTransaction}
				removeFinancialTransaction={removeFinancialTransaction}
				redefineFinancialTransactions={redefineFinancialTransactions}
				editable={canEditTransactions}
			/>
		</ResponsiveMenu>
	);
}
