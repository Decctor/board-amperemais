import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { getAccountingEntryBalanceError } from "@/lib/finances/accounting-entry-balance";
import { invalidateFinanceQueries } from "@/lib/finances/invalidate-finance-queries";
import { formatToMoney } from "@/lib/formatting";
import { updatePurchase as updatePurchaseMutation } from "@/lib/mutations/purchases";
import { usePurchaseState } from "@/state-hooks/use-purchase-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PurchaseAccountingEntryBlock from "./Blocks/AccountingEntry";
import PurchaseGeneralBlock from "./Blocks/General";
import PurchaseOrderBlock from "./Blocks/Order";
import PurchaseItemsBlock, { getPurchaseItemsTotal } from "./Blocks/Items";
import PurchaseTransportBlock from "./Blocks/Transport";
import PurchaseDeliveryBlock from "./Blocks/Delivery";
import { usePurchaseById } from "@/lib/queries/purchases";
import { useEffect, useRef } from "react";

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
export default function ControlPurchase({ purchaseId, closeModal, callbacks }: ControlPurchaseProps) {
	const queryClient = useQueryClient();
	const { data: purchase, isLoading, isError, error } = usePurchaseById({ id: purchaseId });
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
	const hydratedPurchaseIdRef = useRef<string | null>(null);

	const balanceError = getAccountingEntryBalanceError({
		entryValue: state.lancamentoContabil.valor,
		transactions: state.lancamentoContabil.transacoes,
	});
	const balanceDelta =
		state.lancamentoContabil.valor - state.lancamentoContabil.transacoes.filter((t) => !t.deletar).reduce((acc, t) => acc + (t.valor || 0), 0);
	const purchaseIsReceived = purchase?.status === "RECEBIDA";
	const itemsTotal = getPurchaseItemsTotal(state.purchaseItems);
	// Recebida, o valor já está congelado e conferido; a checagem só vale para a transição.
	const itemsTotalError =
		!purchaseIsReceived && state.purchase.status === "RECEBIDA" && Math.round(itemsTotal * 100) !== Math.round(state.lancamentoContabil.valor * 100)
			? `O valor efetivo precisa ser igual ao total dos itens (${formatToMoney(itemsTotal)}) para receber a compra.`
			: null;

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
			void invalidateFinanceQueries(queryClient, { accountingEntryId: state.lancamentoContabil.id });
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
		if (purchase && hydratedPurchaseIdRef.current !== purchase.id) {
			hydratedPurchaseIdRef.current = purchase.id;
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
								valorBase: transaction.valorBase,
								valorJuros: transaction.valorJuros,
								valorMulta: transaction.valorMulta,
								valorTaxas: transaction.valorTaxas,
								valorDesconto: transaction.valorDesconto,
								modificadoresMetadata: transaction.modificadoresMetadata,
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
		}
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
				if (itemsTotalError) return toast.error(itemsTotalError);
				handleUpdatePurchaseMutation({
					purchaseId,
					purchase: state.purchase,
					importedDocuments: state.purchase.documentosImportados?.documentos ?? [],
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
				importedDocuments={state.purchase.documentosImportados}
				locked={purchaseIsReceived}
			/>
			{/* A programação de pagamento segue editável mesmo após o recebimento — reprogramar um pagamento
			    é justamente o caso de uso principal. O valor efetivo, não: ele já virou lote e linha contábil. */}
			<PurchaseAccountingEntryBlock
				accountingEntry={state.lancamentoContabil}
				updateAccountingEntry={updateAccountingEntry}
				addAccountingEntryTransaction={addAccountingEntryTransaction}
				updateAccountingEntryTransaction={updateAccountingEntryTransaction}
				removeAccountingEntryTransaction={removeAccountingEntryTransaction}
				itemsTotal={itemsTotal}
				valueLocked={purchaseIsReceived}
			/>
			<PurchaseOrderBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseTransportBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseDeliveryBlock purchase={state.purchase} updatePurchase={updatePurchase} />
		</ResponsiveMenu>
	);
}
