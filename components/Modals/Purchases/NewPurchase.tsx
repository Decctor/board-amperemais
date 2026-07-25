import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { getAccountingEntryBalanceError } from "@/lib/finances/accounting-entry-balance";
import { formatToMoney } from "@/lib/formatting";
import { createPurchase } from "@/lib/mutations/purchases";
import { usePurchaseState } from "@/state-hooks/use-purchase-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import PurchaseAccountingEntryBlock from "./Blocks/AccountingEntry";
import PurchaseGeneralBlock from "./Blocks/General";
import PurchaseOrderBlock from "./Blocks/Order";
import PurchaseItemsBlock from "./Blocks/Items";
import PurchaseTransportBlock from "./Blocks/Transport";
import PurchaseDeliveryBlock from "./Blocks/Delivery";

type NewPurchaseProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewPurchase({ user, closeModal, callbacks }: NewPurchaseProps) {
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
	} = usePurchaseState({
		initialState: {},
	});

	const balanceError = getAccountingEntryBalanceError({
		entryValue: state.lancamentoContabil.valor,
		transactions: state.lancamentoContabil.transacoes,
	});
	const balanceDelta =
		state.lancamentoContabil.valor - state.lancamentoContabil.transacoes.filter((t) => !t.deletar).reduce((acc, t) => acc + (t.valor || 0), 0);

	const { mutate: handleCreatePurchaseMutation, isPending } = useMutation({
		mutationKey: ["create-purchase"],
		mutationFn: createPurchase,
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

	return (
		<ResponsiveMenu
			menuTitle="NOVA COMPRA"
			menuDescription="Preencha os campos abaixo para criar uma nova compra..."
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				// O servidor rejeita um lançamento desbalanceado; a tela já sabe o delta, então não faz
				// sentido gastar um round-trip para descobrir.
				if (balanceError) return toast.error(balanceError);
				handleCreatePurchaseMutation(state);
			}}
			menuActionButtonText={balanceError ? `FALTAM ${formatToMoney(Math.abs(balanceDelta))}` : "CRIAR COMPRA"}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
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
			/>
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
