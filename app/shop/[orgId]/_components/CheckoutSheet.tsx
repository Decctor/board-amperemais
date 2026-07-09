"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/errors";
import { createShopOrder } from "@/lib/mutations/shop";
import { HAPTICS, triggerHaptic } from "@/lib/shop/haptics";
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
	CLIENTE: "Seus dados",
	ENTREGA: "Forma de entrega",
	CASHBACK: "Descontos",
	PAGAMENTO: "Forma de pagamento",
	REVISAO: "Revisar pedido",
};

const SHOP_ORDER_PUBLIC_TOKEN_CONFLICT_MESSAGE = "Este pedido foi alterado após uma tentativa anterior. Tente enviar novamente.";

export default function CheckoutSheet() {
	const router = useRouter();
	const { orgId, availability, orderState, isCheckoutOpen, setIsCheckoutOpen, setIsCartOpen } = useShop();
	const { checkoutStep } = orderState.state;
	const isOpen = availability.status === "ABERTA";

	const { mutate: submitOrder, isPending } = useMutation({
		mutationKey: ["create-shop-order", orgId],
		mutationFn: () => createShopOrder({ orgId, input: orderState.orderInput }),
		onSuccess: (data) => {
			triggerHaptic(HAPTICS.success);
			orderState.clearCart();
			setIsCheckoutOpen(false);
			router.replace("/shop/" + orgId + "/pedidos/" + data.data.publicAccessToken);
		},
		onError: (error) => {
			triggerHaptic(HAPTICS.warning);
			const message = getErrorMessage(error);
			if (message === SHOP_ORDER_PUBLIC_TOKEN_CONFLICT_MESSAGE) {
				orderState.refreshOrderIdentity();
			}
			toast.error(message);
		},
	});

	const isInCheckout = ["CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"].includes(checkoutStep);

	const visibleSteps = orderState.state.customer.id
		? ["CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"]
		: ["CLIENTE", "ENTREGA", "PAGAMENTO", "REVISAO"];
	const stepIndex = visibleSteps.indexOf(checkoutStep);
	const stepProgress = stepIndex >= 0 ? ((stepIndex + 1) / visibleSteps.length) * 100 : 0;

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

	// Single chokepoint for the "advanced a step" tap, so every step's CONTINUAR
	// gets the same confirmation. Back navigation stays silent: it's a correction.
	const advanceStep = () => {
		triggerHaptic(HAPTICS.tap);
		orderState.nextStep();
	};

	const handleNextFromDelivery = () => {
		triggerHaptic(HAPTICS.tap);
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
		<Sheet open={isCheckoutOpen && isInCheckout} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0 data-[side=bottom]:h-[92dvh]"
			>
				<div className="relative flex min-h-0 flex-1 flex-col">
					<SheetHeader className="flex shrink-0 flex-row items-center gap-3 border-b p-4 text-left">
						<Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 shrink-0" aria-label="Voltar" onClick={handleBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className="min-w-0 flex-1">
							<SheetTitle className="text-lg font-black">{STEP_TITLES[checkoutStep]}</SheetTitle>
							<SheetDescription>{stepIndex >= 0 ? `Etapa ${stepIndex + 1} de ${visibleSteps.length}` : "Finalizar pedido"}</SheetDescription>
						</div>
					</SheetHeader>

					<div className="h-1 w-full shrink-0 bg-muted" aria-hidden>
						<div className="h-full bg-brand transition-[width] duration-300 ease-out" style={{ width: `${stepProgress}%` }} />
					</div>

					<div
						ref={stepScrollRef}
						className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:px-6"
					>
						{!isOpen && (
							<div className="rounded-2xl border border-brand-secondary/30 bg-brand-secondary/10 px-4 py-3">
								<p className="text-sm font-bold">A loja fechou enquanto você finalizava.</p>
								<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
									Seu pedido está salvo. Volte durante o horário de atendimento para enviar.
								</p>
							</div>
						)}

						{checkoutStep === "CLIENTE" && <CustomerIdentityStep onNext={advanceStep} />}

						{checkoutStep === "ENTREGA" && <DeliveryStep onNext={handleNextFromDelivery} />}

						{checkoutStep === "CASHBACK" && <CashbackStep onNext={advanceStep} />}

						{checkoutStep === "PAGAMENTO" && <PaymentStep onNext={advanceStep} />}

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
