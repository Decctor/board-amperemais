import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { getAccountingEntryBalanceError } from "@/lib/finances/accounting-entry-balance";
import { formatToMoney } from "@/lib/formatting";
import { updatePurchase as updatePurchaseMutation } from "@/lib/mutations/purchases";
import { usePurchaseState } from "@/state-hooks/use-purchase-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PurchaseAccountingEntryBlock from "./Blocks/AccountingEntry";
import PurchaseGeneralBlock from "./Blocks/General";
import PurchaseOrderBlock from "./Blocks/Order";
import PurchaseItemsBlock from "./Blocks/Items";
import PurchaseTransportBlock from "./Blocks/Transport";
import PurchaseDeliveryBlock from "./Blocks/Delivery";
import { usePurchaseById } from "@/lib/queries/purchases";
import { useEffect } from "react";

type TPurchaseByIdItem = NonNullable<ReturnType<typeof usePurchaseById>["data"]>["itens"][number];

function getPurchaseItemsTotal(items: TPurchaseByIdItem[]) {
	return items.reduce((acc, item) => {
		const valorTotalBruto = Number(item.valorTotalBruto) || (Number(item.quantidade) || 0) * (Number(item.valorUnitarioBruto) || 0);
		const total = Number(item.valorTotalLiquido) || valorTotalBruto - (Number(item.descontosTotal) || 0) + (Number(item.acrescimosTotal) || 0);
		return acc + total;
	}, 0);
}

type ControlPurchaseProps = {
	purchaseId: string;
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlPurchase({ purchaseId, user, closeModal, callbacks }: ControlPurchaseProps) {
	const queryClient = useQueryClient();
	const { data: purchase, queryKey, isLoading, isError, isSuccess, error } = usePurchaseById({ id: purchaseId });
	const {
		state,
		updatePurchase,
		addPurchaseItem,
		updatePurchaseItem,
		removePurchaseItem,
		updateAccountingEntry,
		addAccountingEntryTransaction,
		updateAccountingEntryTransaction,
		removeAccountingEntryTransaction,
		resetState,
		redefineState,
	} = usePurchaseState({
		initialState: {},
	});

	const balanceError = getAccountingEntryBalanceError({
		entryValue: state.lancamentoContabil.valor,
		transactions: state.lancamentoContabil.transacoes,
	});
	const balanceDelta =
		state.lancamentoContabil.valor - state.lancamentoContabil.transacoes.filter((t) => !t.deletar).reduce((acc, t) => acc + (t.valor || 0), 0);

	const { mutate: handleUpdatePurchaseMutation, isPending } = useMutation({
		mutationKey: ["update-purchase", purchaseId],
		mutationFn: updatePurchaseMutation,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			resetState();
			return closeModal();
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

	useEffect(() => {
		if (purchase)
			redefineState({
				purchase: purchase,
				purchaseItems: purchase.itens,
				// Compras criadas antes do módulo contábil não têm lançamento; nesse caso semeamos um a partir
				// da própria compra, de modo que a próxima atualização passe a gerar o lançamento.
				lancamentoContabil: purchase.lancamentoContabil
					? {
							id: purchase.lancamentoContabil.id,
							titulo: purchase.lancamentoContabil.titulo,
							anotacoes: purchase.lancamentoContabil.anotacoes,
							valor: purchase.lancamentoContabil.valor,
							valorPrevisto: purchase.lancamentoContabil.valorPrevisto,
							dataCompetencia: purchase.lancamentoContabil.dataCompetencia,
							transacoes: purchase.lancamentoContabil.transacoesFinanceiras.map((transaction) => ({
								id: transaction.id,
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
						}
					: {
							titulo: purchase.titulo,
							anotacoes: null,
							valor: getPurchaseItemsTotal(purchase.itens),
							valorPrevisto: null,
							dataCompetencia: purchase.pedidoData ?? purchase.dataInsercao ?? new Date(),
							transacoes: [],
						},
			});
	}, [purchase, redefineState]);
	return (
		<ResponsiveMenu
			menuTitle="ATUALIZAR COMPRA"
			menuDescription="Preencha os campos abaixo para atualizar a compra..."
			menuActionButtonText={balanceError ? `FALTAM ${formatToMoney(Math.abs(balanceDelta))}` : "ATUALIZAR COMPRA"}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				// O servidor rejeita um lançamento desbalanceado; a tela já sabe o delta.
				if (balanceError) return toast.error(balanceError);
				handleUpdatePurchaseMutation({
					purchaseId,
					purchase: state.purchase,
					purchaseItems: state.purchaseItems,
					lancamentoContabil: state.lancamentoContabil,
				});
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<PurchaseGeneralBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseItemsBlock
				purchaseItems={state.purchaseItems}
				addPurchaseItem={addPurchaseItem}
				updatePurchaseItem={updatePurchaseItem}
				removePurchaseItem={removePurchaseItem}
				updatePurchase={updatePurchase}
				accountingEntry={state.lancamentoContabil}
				updateAccountingEntry={updateAccountingEntry}
				fornecedorId={state.purchase.fornecedorId}
				locked={purchase?.status === "RECEBIDA"}
			/>
			{/* O lançamento e sua programação de pagamento seguem editáveis mesmo após o recebimento —
			    reprogramar um pagamento é justamente o caso de uso principal. */}
			<PurchaseAccountingEntryBlock
				accountingEntry={state.lancamentoContabil}
				updateAccountingEntry={updateAccountingEntry}
				addAccountingEntryTransaction={addAccountingEntryTransaction}
				updateAccountingEntryTransaction={updateAccountingEntryTransaction}
				removeAccountingEntryTransaction={removeAccountingEntryTransaction}
			/>
			<PurchaseOrderBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseTransportBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseDeliveryBlock purchase={state.purchase} updatePurchase={updatePurchase} />
		</ResponsiveMenu>
	);
}
