"use client";

import FinancialTransactionEffectBlock from "@/components/Modals/Finances/Blocks/Effect";
import FinancialTransactionRelationsBlock from "@/components/Modals/Finances/Blocks/Relations";
import FinancialTransactionSummaryBlock from "@/components/Modals/Finances/Blocks/Summary";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { effectFinancialTransaction, updateFinancialTransaction } from "@/lib/mutations/finances";
import { useFinancesAccounts, useFinancialTransactionById } from "@/lib/queries/finances";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FinancialTransactionMenuProps = {
	transactionId: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function getDefaultEffectDate(transaction: { dataEfetivacao: Date | null; dataPrevisao: Date }) {
	if (transaction.dataEfetivacao) return new Date(transaction.dataEfetivacao).toISOString().slice(0, 10);
	return new Date(transaction.dataPrevisao).toISOString().slice(0, 10);
}

export default function FinancialTransactionMenu({ transactionId, closeMenu, callbacks }: FinancialTransactionMenuProps) {
	const queryClient = useQueryClient();
	const { data: transaction, isLoading, isError, error } = useFinancialTransactionById(transactionId);
	const { data: financialAccountsData } = useFinancesAccounts({ initialFilters: { activeOnly: true } });
	const financialAccounts = financialAccountsData?.accounts ?? [];

	const [effectDate, setEffectDate] = useState<string | undefined>(undefined);
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
	const [selectedMethod, setSelectedMethod] = useState<TPaymentMethodEnum>("DINHEIRO");

	const isEffective = !!transaction?.dataEfetivacao;
	const canChangeMethodOnEffect = transaction?.metodo === "A_DEFINIR";

	useEffect(() => {
		if (!transaction) return;
		setEffectDate(getDefaultEffectDate(transaction));
		setSelectedAccountId(transaction.contaFinanceira?.id ?? null);
		setSelectedMethod(transaction.metodo === "A_DEFINIR" ? "DINHEIRO" : transaction.metodo);
	}, [transaction]);

	const invalidateTransactionQueries = () => {
		void queryClient.invalidateQueries({ queryKey: ["finances-financial-transactions"] });
		void queryClient.invalidateQueries({ queryKey: ["finances-financial-transaction-by-id", transactionId] });
	};

	const { mutate: mutateEffectTransaction, isPending: isEffecting } = useMutation({
		mutationKey: ["effect-financial-transaction", transactionId],
		mutationFn: effectFinancialTransaction,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			invalidateTransactionQueries();
			closeMenu();
		},
		onError: (err) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(err));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const { mutate: mutateUpdateTransaction, isPending: isUpdating } = useMutation({
		mutationKey: ["update-financial-transaction", transactionId],
		mutationFn: updateFinancialTransaction,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			invalidateTransactionQueries();
			closeMenu();
		},
		onError: (err) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(err));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	function buildTransactionPayload() {
		return {
			dataEfetivacao: effectDate ? new Date(effectDate) : null,
			contaFinanceiraId: selectedAccountId,
			metodo: isEffective || canChangeMethodOnEffect ? selectedMethod : ("A_DEFINIR" as const),
		};
	}

	function handleSave() {
		if (!transaction) return;
		if (isEffective) {
			mutateUpdateTransaction({
				transactionId: transaction.id,
				transaction: buildTransactionPayload(),
			});
			return;
		}
		mutateEffectTransaction({
			transactionId: transaction.id,
			transaction: buildTransactionPayload(),
		});
	}

	const stateError = isError ? getErrorMessage(error) : null;
	const isSaving = isEffecting || isUpdating;

	return (
		<ResponsiveMenu
			menuTitle="MOVIMENTAÇÃO FINANCEIRA"
			menuDescription={isEffective ? "Ajuste os dados de efetivação desta movimentação." : "Revise os vínculos e confirme a efetivação."}
			menuActionButtonText={isEffective ? "SALVAR" : "EFETIVAR"}
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={handleSave}
			actionIsLoading={isSaving}
			stateIsLoading={isLoading}
			stateError={stateError}
		>
			{transaction && !isLoading && !stateError ? (
				<>
					<FinancialTransactionEffectBlock
						financialAccounts={financialAccounts}
						effectDate={effectDate}
						setEffectDate={setEffectDate}
						selectedAccountId={selectedAccountId}
						setSelectedAccountId={setSelectedAccountId}
						selectedMethod={selectedMethod}
						setSelectedMethod={setSelectedMethod}
						allowMethodChange={isEffective || canChangeMethodOnEffect}
					/>
					<FinancialTransactionSummaryBlock transaction={transaction} />
					<FinancialTransactionRelationsBlock transaction={transaction} />
				</>
			) : null}
		</ResponsiveMenu>
	);
}
