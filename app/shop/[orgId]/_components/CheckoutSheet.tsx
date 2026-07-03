"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/errors";
import { createShopOrder } from "@/lib/mutations/shop";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import CashbackStep from "./checkout/CashbackStep";
import CustomerIdentityStep from "./checkout/CustomerIdentityStep";
import DeliveryStep from "./checkout/DeliveryStep";
import OrderReviewStep from "./checkout/OrderReviewStep";
import PaymentStep from "./checkout/PaymentStep";
import { useShop } from "./ShopProvider";

const STEP_TITLES: Record<string, string> = {
	CLIENTE: "SEUS DADOS",
	ENTREGA: "FORMA DE ENTREGA",
	CASHBACK: "DESCONTOS",
	PAGAMENTO: "FORMA DE PAGAMENTO",
	REVISAO: "REVISAR PEDIDO",
};

const SHOP_ORDER_PUBLIC_TOKEN_CONFLICT_MESSAGE = "Este pedido foi alterado após uma tentativa anterior. Tente enviar novamente.";

export default function CheckoutSheet() {
	const router = useRouter();
	const { orgId, catalog, orderState, isCheckoutOpen, setIsCheckoutOpen, setIsCartOpen } = useShop();
	const { checkoutStep } = orderState.state;
	const isOpen = catalog.disponibilidade.status === "ABERTA";

	const { mutate: submitOrder, isPending } = useMutation({
		mutationKey: ["create-shop-order", orgId],
		mutationFn: () => createShopOrder({ orgId, input: orderState.orderInput }),
		onSuccess: (data) => {
			orderState.clearCart();
			setIsCheckoutOpen(false);
			router.replace("/shop/" + orgId + "/pedidos/" + data.data.publicAccessToken);
		},
		onError: (error) => {
			const message = getErrorMessage(error);
			if (message === SHOP_ORDER_PUBLIC_TOKEN_CONFLICT_MESSAGE) {
				orderState.refreshOrderIdentity();
			}
			toast.error(message);
		},
	});

	const isInCheckout = ["CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"].includes(checkoutStep);

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

	const canSkipDiscounts = !orderState.state.customer.id;

	const handleNextFromDelivery = () => {
		if (canSkipDiscounts) {
			orderState.setCheckoutStep("PAGAMENTO");
		} else {
			orderState.nextStep();
		}
	};

	const stepScrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		stepScrollRef.current?.scrollTo({ top: 0 });
	}, [checkoutStep]);

	return (
		<Sheet open={isOpen && isCheckoutOpen && isInCheckout} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0 data-[side=bottom]:h-[92dvh]"
			>
				<div className="relative flex min-h-0 flex-1 flex-col">
					<SheetHeader className="flex shrink-0 flex-row items-center gap-3 border-b p-4 text-left">
						<Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 shrink-0" onClick={handleBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className="min-w-0 flex-1">
							<SheetTitle className="text-lg font-black">{STEP_TITLES[checkoutStep]}</SheetTitle>
							<SheetDescription>FINALIZAR PEDIDO</SheetDescription>
						</div>
					</SheetHeader>

					<div
						ref={stepScrollRef}
						className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:px-6"
					>
						{checkoutStep === "CLIENTE" && <CustomerIdentityStep onNext={() => orderState.nextStep()} />}

						{checkoutStep === "ENTREGA" && <DeliveryStep onNext={handleNextFromDelivery} />}

						{checkoutStep === "CASHBACK" && <CashbackStep onNext={() => orderState.nextStep()} />}

						{checkoutStep === "PAGAMENTO" && <PaymentStep onNext={() => orderState.nextStep()} />}

						{checkoutStep === "REVISAO" && <OrderReviewStep onSubmit={() => submitOrder()} isSubmitting={isPending} />}
					</div>

					{isPending && (
						<div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
							<div className="flex flex-col items-center gap-3">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
								<p className="text-sm font-medium">Enviando pedido...</p>
							</div>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
