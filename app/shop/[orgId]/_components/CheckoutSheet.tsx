"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getErrorMessage } from "@/lib/errors";
import { createShopOrder } from "@/lib/mutations/shop";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CashbackStep from "./checkout/CashbackStep";
import CustomerIdentityStep from "./checkout/CustomerIdentityStep";
import DeliveryStep from "./checkout/DeliveryStep";
import OrderReviewStep from "./checkout/OrderReviewStep";
import { useShop } from "./ShopProvider";

const STEP_TITLES: Record<string, string> = {
	CLIENTE: "Seus dados",
	ENTREGA: "Forma de entrega",
	CASHBACK: "Usar cashback",
	REVISAO: "Revisar pedido",
};

export default function CheckoutSheet() {
	const { orgId, catalog, orderState, isCheckoutOpen, setIsCheckoutOpen, setIsCartOpen } = useShop();
	const { checkoutStep } = orderState.state;

	const { mutate: submitOrder, isPending } = useMutation({
		mutationKey: ["create-shop-order", orgId],
		mutationFn: () => createShopOrder({ orgId, input: orderState.orderInput }),
		onSuccess: (data) => {
			orderState.setLastOrder({
				saleId: data.data.saleId,
				orderNumber: data.data.orderNumber,
			});
			orderState.clearCart();
			setIsCheckoutOpen(false);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const isInCheckout = ["CLIENTE", "ENTREGA", "CASHBACK", "REVISAO"].includes(checkoutStep);

	const handleBack = () => {
		if (checkoutStep === "CLIENTE") {
			setIsCheckoutOpen(false);
			orderState.setCheckoutStep("CARRINHO");
			setIsCartOpen(true);
		} else {
			orderState.previousStep();
		}
	};

	const handleClose = () => {
		setIsCheckoutOpen(false);
		orderState.setCheckoutStep("CARRINHO");
	};

	const canSkipCashback =
		!catalog.cashbackProgram ||
		!catalog.cashbackProgram.modalidadeDescontosPermitida ||
		!orderState.state.customer.id;

	const handleNextFromDelivery = () => {
		if (canSkipCashback) {
			orderState.setCheckoutStep("REVISAO");
		} else {
			orderState.nextStep();
		}
	};

	return (
		<Drawer open={isCheckoutOpen && isInCheckout} onOpenChange={(open) => !open && handleClose()}>
			<DrawerContent className="max-h-[90vh]">
				<DrawerHeader className="text-left flex items-center gap-3">
					<Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBack}>
						<ArrowLeft className="w-4 h-4" />
					</Button>
					<div className="flex-1">
						<DrawerTitle className="text-lg font-black">{STEP_TITLES[checkoutStep]}</DrawerTitle>
						<DrawerDescription>Finalizar pedido</DrawerDescription>
					</div>
				</DrawerHeader>

				<div className="flex-1 overflow-auto px-4 pb-4">
					{checkoutStep === "CLIENTE" && (
						<CustomerIdentityStep onNext={() => orderState.nextStep()} />
					)}

					{checkoutStep === "ENTREGA" && <DeliveryStep onNext={handleNextFromDelivery} />}

					{checkoutStep === "CASHBACK" && <CashbackStep onNext={() => orderState.nextStep()} />}

					{checkoutStep === "REVISAO" && (
						<OrderReviewStep
							onSubmit={() => submitOrder()}
							isSubmitting={isPending}
						/>
					)}
				</div>

				{isPending && (
					<div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
						<div className="flex flex-col items-center gap-3">
							<Loader2 className="w-8 h-8 animate-spin text-primary" />
							<p className="text-sm font-medium">Enviando pedido...</p>
						</div>
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
}
