import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updatePurchase as updatePurchaseMutation } from "@/lib/mutations/purchases";
import { usePurchaseState } from "@/state-hooks/use-purchase-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PurchaseGeneralBlock from "./Blocks/General";
import PurchaseOrderBlock from "./Blocks/Order";
import PurchaseItemsBlock from "./Blocks/Items";
import PurchaseTransportBlock from "./Blocks/Transport";
import PurchaseDeliveryBlock from "./Blocks/Delivery";
import { usePurchaseById } from "@/lib/queries/purchases";
import { useEffect } from "react";

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
	const { state, updatePurchase, addPurchaseItem, updatePurchaseItem, removePurchaseItem, resetState, redefineState } = usePurchaseState({
		initialState: {},
	});

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
			});
	}, [purchase, redefineState]);
	return (
		<ResponsiveMenu
			menuTitle="ATUALIZAR COMPRA"
			menuDescription="Preencha os campos abaixo para atualizar a compra..."
			menuActionButtonText="ATUALIZAR COMPRA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleUpdatePurchaseMutation({ purchaseId, purchase: state.purchase, purchaseItems: state.purchaseItems })}
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
				locked={purchase?.status === "RECEBIDA"}
			/>
			<PurchaseOrderBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseTransportBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseDeliveryBlock purchase={state.purchase} updatePurchase={updatePurchase} />
		</ResponsiveMenu>
	);
}
