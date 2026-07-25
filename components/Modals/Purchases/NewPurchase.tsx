import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
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
			menuActionButtonText="CRIAR COMPRA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreatePurchaseMutation(state)}
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
