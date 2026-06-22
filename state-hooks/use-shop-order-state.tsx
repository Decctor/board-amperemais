"use client";

import type { TCreateShopOrderInput, TShopCartItem, TShopCustomer, TShopDelivery, TShopPaymentMethod } from "@/schemas/shop";
import { useCallback, useEffect, useMemo, useState } from "react";

const SHOP_CART_STORAGE_VERSION = 2;

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
	payment: {
		metodo: TShopPaymentMethod;
		observacoes: string;
		precisaTroco: boolean;
		trocoPara: number | null;
	};
	idempotencyKey: string;
	publicAccessToken: string;
	checkoutStep: "CARRINHO" | "CLIENTE" | "ENTREGA" | "CASHBACK" | "PAGAMENTO" | "REVISAO" | "SUCESSO";
	lastOrder: {
		saleId: string;
		orderNumber: string;
	} | null;
};

const CHECKOUT_STEPS: TShopOrderState["checkoutStep"][] = ["CARRINHO", "CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO", "SUCESSO"];

type TStoredShopOrderState = {
	version: number;
	cart: TShopOrderState["cart"];
	customer: Partial<TShopCustomer>;
	delivery: Partial<TShopDelivery>;
	cashback: TShopOrderState["cashback"];
	payment: TShopOrderState["payment"];
	idempotencyKey: string;
	publicAccessToken: string;
};

function getStorageKey(orgId: string) {
	return `shop-cart:${orgId}`;
}

function getDefaultState(orgId: string, mode: "CARDAPIO" | "CATALOGO"): TShopOrderState {
	return {
		orgId,
		mode,
		cart: { items: [] },
		customer: { id: null, nome: "", cpfCnpj: null, telefone: "" },
		delivery: { modalidade: "RETIRADA", endereco: null },
		cashback: { resgateSolicitado: 0 },
		payment: { metodo: "DINHEIRO", observacoes: "", precisaTroco: false, trocoPara: null },
		idempotencyKey: crypto.randomUUID(),
		publicAccessToken: crypto.randomUUID(),
		checkoutStep: "CARRINHO",
		lastOrder: null,
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
			payment: state.payment,
			idempotencyKey: state.idempotencyKey,
			publicAccessToken: state.publicAccessToken,
		};
		window.localStorage.setItem(getStorageKey(orgId), JSON.stringify(payload));
	}, [orgId, state.cart, state.customer, state.delivery, state.cashback, state.payment, state.idempotencyKey, state.publicAccessToken]);

	const addItem = useCallback((item: TShopCartItem) => {
		setState((prev) => ({
			...prev,
			cart: { items: [...prev.cart.items, { ...item, tempId: item.tempId ?? crypto.randomUUID() }] },
			idempotencyKey: crypto.randomUUID(),
		}));
	}, []);

	const updateItemQuantity = useCallback((tempId: string, quantidade: number) => {
		setState((prev) => ({
			...prev,
			cart: {
				items: prev.cart.items.map((item) => (item.tempId === tempId ? { ...item, quantidade: Math.max(1, quantidade) } : item)),
			},
			idempotencyKey: crypto.randomUUID(),
		}));
	}, []);

	const removeItem = useCallback((tempId: string) => {
		setState((prev) => ({
			...prev,
			cart: { items: prev.cart.items.filter((item) => item.tempId !== tempId) },
			idempotencyKey: crypto.randomUUID(),
		}));
	}, []);

	const clearCart = useCallback(() => {
		setState((prev) => ({
			...prev,
			cart: { items: [] },
			cashback: { resgateSolicitado: 0 },
			idempotencyKey: crypto.randomUUID(),
			publicAccessToken: crypto.randomUUID(),
		}));
		if (typeof window !== "undefined") window.localStorage.removeItem(getStorageKey(orgId));
	}, [orgId]);

	const updateCustomer = useCallback((customer: Partial<TShopCustomer>) => {
		setState((prev) => ({ ...prev, customer: { ...prev.customer, ...customer }, idempotencyKey: crypto.randomUUID() }));
	}, []);

	const updateDelivery = useCallback((delivery: Partial<TShopDelivery>) => {
		setState((prev) => ({ ...prev, delivery: { ...prev.delivery, ...delivery }, idempotencyKey: crypto.randomUUID() }));
	}, []);

	const updateCashback = useCallback((cashback: Partial<TShopOrderState["cashback"]>) => {
		setState((prev) => ({ ...prev, cashback: { ...prev.cashback, ...cashback }, idempotencyKey: crypto.randomUUID() }));
	}, []);

	const updatePayment = useCallback((payment: Partial<TShopOrderState["payment"]>) => {
		setState((prev) => ({ ...prev, payment: { ...prev.payment, ...payment }, idempotencyKey: crypto.randomUUID() }));
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
		setState((prev) => ({ ...prev, checkoutStep: "CARRINHO", lastOrder: null }));
	}, []);

	const resetState = useCallback(() => {
		setState(getDefaultState(orgId, mode));
		if (typeof window !== "undefined") window.localStorage.removeItem(getStorageKey(orgId));
	}, [orgId, mode]);

	const setLastOrder = useCallback((lastOrder: TShopOrderState["lastOrder"]) => {
		setState((prev) => ({ ...prev, lastOrder, checkoutStep: lastOrder ? "SUCESSO" : prev.checkoutStep }));
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
			observacoes: null,
		}),
		[state.idempotencyKey, state.publicAccessToken, state.customer, state.delivery, state.cart.items, state.payment, state.cashback.resgateSolicitado],
	);

	return {
		state,
		orderInput,
		addItem,
		updateItemQuantity,
		removeItem,
		clearCart,
		updateCustomer,
		updateDelivery,
		updateCashback,
		updatePayment,
		setCheckoutStep,
		nextStep,
		previousStep,
		resetCheckout,
		resetState,
		hydrateFromStorage,
		setLastOrder,
	};
}

export type TUseShopOrderState = ReturnType<typeof useShopOrderState>;
