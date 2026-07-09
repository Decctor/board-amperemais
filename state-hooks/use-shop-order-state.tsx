"use client";

import type { TAppliedCoupon } from "@/schemas/coupons";
import type { TCreateShopOrderInput, TShopCartItem, TShopCustomer, TShopDelivery, TShopPaymentMethod } from "@/schemas/shop";
import { useCallback, useEffect, useMemo, useState } from "react";

const SHOP_CART_STORAGE_VERSION = 3;

type TShopOrderState = {
	orgId: string;
	mode: "CARDAPIO" | "CATALOGO";
	cart: {
		items: TShopCartItem[];
	};
	customer: TShopCustomer;
	delivery: TShopDelivery;
	cashback: {
		resgateSolicitado: number;
	};
	coupon: {
		resgate: TAppliedCoupon | null;
	};
	payment: {
		metodo: TShopPaymentMethod;
		observacoes: string;
		precisaTroco: boolean;
		trocoPara: number | null;
	};
	idempotencyKey: string;
	publicAccessToken: string;
	checkoutStep: "CARRINHO" | "CLIENTE" | "ENTREGA" | "CASHBACK" | "PAGAMENTO" | "REVISAO";
};

const CHECKOUT_STEPS: TShopOrderState["checkoutStep"][] = ["CARRINHO", "CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"];

type TStoredShopOrderState = {
	version: number;
	cart: TShopOrderState["cart"];
	customer: Partial<TShopCustomer>;
	delivery: Partial<TShopDelivery>;
	cashback: TShopOrderState["cashback"];
	coupon?: TShopOrderState["coupon"];
	payment: TShopOrderState["payment"];
	idempotencyKey: string;
	publicAccessToken: string;
};

function getStorageKey(orgId: string) {
	return `shop-cart:${orgId}`;
}

function createOrderIdentity() {
	return {
		idempotencyKey: crypto.randomUUID(),
		publicAccessToken: crypto.randomUUID(),
	};
}

function getDefaultState(orgId: string, mode: "CARDAPIO" | "CATALOGO"): TShopOrderState {
	return {
		orgId,
		mode,
		cart: { items: [] },
		customer: { id: null, nome: "", cpfCnpj: null, telefone: "" },
		delivery: { modalidade: "RETIRADA", endereco: null },
		cashback: { resgateSolicitado: 0 },
		coupon: { resgate: null },
		payment: { metodo: "DINHEIRO", observacoes: "", precisaTroco: false, trocoPara: null },
		...createOrderIdentity(),
		checkoutStep: "CARRINHO",
	};
}

export function useShopOrderState({ orgId, mode }: { orgId: string; mode: "CARDAPIO" | "CATALOGO" }) {
	const [state, setState] = useState<TShopOrderState>(() => getDefaultState(orgId, mode));

	const hydrateFromStorage = useCallback(() => {
		if (typeof window === "undefined") return;
		const raw = window.localStorage.getItem(getStorageKey(orgId));
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as TStoredShopOrderState;
			if (parsed.version !== SHOP_CART_STORAGE_VERSION) return;
			setState((prev) => ({
				...prev,
				cart: parsed.cart ?? prev.cart,
				customer: { ...prev.customer, ...parsed.customer },
				delivery: { ...prev.delivery, ...parsed.delivery },
				cashback: parsed.cashback ?? prev.cashback,
				coupon: parsed.coupon ?? prev.coupon,
				payment: parsed.payment ?? prev.payment,
				idempotencyKey: parsed.idempotencyKey ?? prev.idempotencyKey,
				publicAccessToken: parsed.publicAccessToken ?? prev.publicAccessToken,
			}));
		} catch {
			window.localStorage.removeItem(getStorageKey(orgId));
		}
	}, [orgId]);

	useEffect(() => {
		hydrateFromStorage();
	}, [hydrateFromStorage]);

	useEffect(() => {
		setState((prev) => ({ ...prev, orgId, mode }));
	}, [orgId, mode]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const payload: TStoredShopOrderState = {
			version: SHOP_CART_STORAGE_VERSION,
			cart: state.cart,
			customer: state.customer,
			delivery: state.delivery,
			cashback: state.cashback,
			coupon: state.coupon,
			payment: state.payment,
			idempotencyKey: state.idempotencyKey,
			publicAccessToken: state.publicAccessToken,
		};
		// Debounced: updates arrive per keystroke (payment notes, address fields) and
		// serializing the whole cart on each one is wasted main-thread work.
		const timeout = window.setTimeout(() => {
			window.localStorage.setItem(getStorageKey(orgId), JSON.stringify(payload));
		}, 300);
		return () => window.clearTimeout(timeout);
	}, [orgId, state.cart, state.customer, state.delivery, state.cashback, state.coupon, state.payment, state.idempotencyKey, state.publicAccessToken]);

	const addItem = useCallback((item: TShopCartItem) => {
		setState((prev) => ({
			...prev,
			cart: { items: [...prev.cart.items, { ...item, tempId: item.tempId ?? crypto.randomUUID() }] },
			coupon: { resgate: null },
			...createOrderIdentity(),
		}));
	}, []);

	const updateItemQuantity = useCallback((tempId: string, quantidade: number) => {
		setState((prev) => ({
			...prev,
			cart: {
				items: prev.cart.items.map((item) => (item.tempId === tempId ? { ...item, quantidade: Math.max(1, quantidade) } : item)),
			},
			coupon: { resgate: null },
			...createOrderIdentity(),
		}));
	}, []);

	const replaceItem = useCallback((tempId: string, item: TShopCartItem) => {
		setState((prev) => ({
			...prev,
			cart: { items: prev.cart.items.map((existing) => (existing.tempId === tempId ? { ...item, tempId } : existing)) },
			coupon: { resgate: null },
			...createOrderIdentity(),
		}));
	}, []);

	const removeItem = useCallback((tempId: string) => {
		setState((prev) => ({
			...prev,
			cart: { items: prev.cart.items.filter((item) => item.tempId !== tempId) },
			coupon: { resgate: null },
			...createOrderIdentity(),
		}));
	}, []);

	const clearCart = useCallback(() => {
		setState((prev) => ({
			...prev,
			cart: { items: [] },
			cashback: { resgateSolicitado: 0 },
			coupon: { resgate: null },
			...createOrderIdentity(),
		}));
		if (typeof window !== "undefined") window.localStorage.removeItem(getStorageKey(orgId));
	}, [orgId]);

	const updateCustomer = useCallback((customer: Partial<TShopCustomer>) => {
		setState((prev) => {
			const nextCustomer = { ...prev.customer, ...customer };
			const shouldClearBenefits = customer.id !== undefined && customer.id !== prev.customer.id;
			return {
				...prev,
				customer: nextCustomer,
				cashback: shouldClearBenefits ? { resgateSolicitado: 0 } : prev.cashback,
				coupon: shouldClearBenefits ? { resgate: null } : prev.coupon,
				...createOrderIdentity(),
			};
		});
	}, []);

	const updateDelivery = useCallback((delivery: Partial<TShopDelivery>) => {
		setState((prev) => ({ ...prev, delivery: { ...prev.delivery, ...delivery }, ...createOrderIdentity() }));
	}, []);

	const updateCashback = useCallback((cashback: Partial<TShopOrderState["cashback"]>) => {
		setState((prev) => ({ ...prev, cashback: { ...prev.cashback, ...cashback }, ...createOrderIdentity() }));
	}, []);

	const updateCoupon = useCallback((coupon: TShopOrderState["coupon"]["resgate"]) => {
		setState((prev) => ({ ...prev, coupon: { resgate: coupon }, ...createOrderIdentity() }));
	}, []);

	const updatePayment = useCallback((payment: Partial<TShopOrderState["payment"]>) => {
		setState((prev) => ({ ...prev, payment: { ...prev.payment, ...payment }, ...createOrderIdentity() }));
	}, []);

	const setCheckoutStep = useCallback((checkoutStep: TShopOrderState["checkoutStep"]) => {
		setState((prev) => ({ ...prev, checkoutStep }));
	}, []);

	const nextStep = useCallback(() => {
		setState((prev) => {
			const index = CHECKOUT_STEPS.indexOf(prev.checkoutStep);
			return { ...prev, checkoutStep: CHECKOUT_STEPS[Math.min(CHECKOUT_STEPS.length - 1, index + 1)] };
		});
	}, []);

	const previousStep = useCallback(() => {
		setState((prev) => {
			const index = CHECKOUT_STEPS.indexOf(prev.checkoutStep);
			return { ...prev, checkoutStep: CHECKOUT_STEPS[Math.max(0, index - 1)] };
		});
	}, []);

	const resetCheckout = useCallback(() => {
		setState((prev) => ({ ...prev, checkoutStep: "CARRINHO" }));
	}, []);

	const resetState = useCallback(() => {
		setState(getDefaultState(orgId, mode));
		if (typeof window !== "undefined") window.localStorage.removeItem(getStorageKey(orgId));
	}, [orgId, mode]);

	const refreshOrderIdentity = useCallback(() => {
		setState((prev) => ({ ...prev, ...createOrderIdentity() }));
	}, []);

	const orderInput = useMemo<TCreateShopOrderInput>(
		() => ({
			idempotencyKey: state.idempotencyKey,
			publicAccessToken: state.publicAccessToken,
			cliente: state.customer,
			entrega: state.delivery,
			itens: state.cart.items,
			pagamento: {
				metodo: state.payment.metodo,
				observacoes:
					[
						state.payment.precisaTroco && state.payment.trocoPara ? `Troco para R$ ${state.payment.trocoPara.toFixed(2).replace(".", ",")}.` : null,
						state.payment.observacoes.trim() || null,
					]
						.filter(Boolean)
						.join(" ") || null,
			},
			cashbackResgateSolicitado: state.cashback.resgateSolicitado,
			cupomResgate: state.coupon.resgate,
			observacoes: null,
		}),
		[
			state.idempotencyKey,
			state.publicAccessToken,
			state.customer,
			state.delivery,
			state.cart.items,
			state.payment,
			state.cashback.resgateSolicitado,
			state.coupon.resgate,
		],
	);

	return {
		state,
		orderInput,
		addItem,
		updateItemQuantity,
		replaceItem,
		removeItem,
		clearCart,
		updateCustomer,
		updateDelivery,
		updateCashback,
		updateCoupon,
		updatePayment,
		setCheckoutStep,
		nextStep,
		previousStep,
		resetCheckout,
		resetState,
		hydrateFromStorage,
		refreshOrderIdentity,
	};
}

export type TUseShopOrderState = ReturnType<typeof useShopOrderState>;
