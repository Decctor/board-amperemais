"use client";

import type { TCreateShopOrderInput, TShopCartItem, TShopCustomer, TShopDelivery } from "@/schemas/shop";
import { useCallback, useEffect, useMemo, useState } from "react";

const SHOP_CART_STORAGE_VERSION = 1;

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
	checkoutStep: "CARRINHO" | "CLIENTE" | "ENTREGA" | "CASHBACK" | "REVISAO" | "SUCESSO";
	lastOrder: {
		saleId: string;
		orderNumber: string;
	} | null;
};

const CHECKOUT_STEPS: TShopOrderState["checkoutStep"][] = ["CARRINHO", "CLIENTE", "ENTREGA", "CASHBACK", "REVISAO", "SUCESSO"];

type TStoredShopOrderState = {
	version: number;
	cart: TShopOrderState["cart"];
	customer: Partial<TShopCustomer>;
	delivery: Partial<TShopDelivery>;
	cashback: TShopOrderState["cashback"];
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
		};
		window.localStorage.setItem(getStorageKey(orgId), JSON.stringify(payload));
	}, [orgId, state.cart, state.customer, state.delivery, state.cashback]);

	const addItem = useCallback((item: TShopCartItem) => {
		setState((prev) => ({
			...prev,
			cart: { items: [...prev.cart.items, { ...item, tempId: item.tempId ?? crypto.randomUUID() }] },
		}));
	}, []);

	const updateItemQuantity = useCallback((tempId: string, quantidade: number) => {
		setState((prev) => ({
			...prev,
			cart: {
				items: prev.cart.items.map((item) => (item.tempId === tempId ? { ...item, quantidade: Math.max(1, quantidade) } : item)),
			},
		}));
	}, []);

	const removeItem = useCallback((tempId: string) => {
		setState((prev) => ({
			...prev,
			cart: { items: prev.cart.items.filter((item) => item.tempId !== tempId) },
		}));
	}, []);

	const clearCart = useCallback(() => {
		setState((prev) => ({ ...prev, cart: { items: [] }, cashback: { resgateSolicitado: 0 } }));
		if (typeof window !== "undefined") window.localStorage.removeItem(getStorageKey(orgId));
	}, [orgId]);

	const updateCustomer = useCallback((customer: Partial<TShopCustomer>) => {
		setState((prev) => ({ ...prev, customer: { ...prev.customer, ...customer } }));
	}, []);

	const updateDelivery = useCallback((delivery: Partial<TShopDelivery>) => {
		setState((prev) => ({ ...prev, delivery: { ...prev.delivery, ...delivery } }));
	}, []);

	const updateCashback = useCallback((cashback: Partial<TShopOrderState["cashback"]>) => {
		setState((prev) => ({ ...prev, cashback: { ...prev.cashback, ...cashback } }));
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
			cliente: state.customer,
			entrega: state.delivery,
			itens: state.cart.items,
			cashbackResgateSolicitado: state.cashback.resgateSolicitado,
			observacoes: null,
		}),
		[state.customer, state.delivery, state.cart.items, state.cashback.resgateSolicitado],
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
