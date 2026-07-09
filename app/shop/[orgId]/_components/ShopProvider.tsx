"use client";

import type { TGetShopCatalogOutput } from "@/app/api/shop/[orgId]/catalog/route";
import { useShopAvailability } from "@/lib/queries/shop";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import type { TShopCartItem } from "@/schemas/shop";
import { type TUseShopOrderState, useShopOrderState } from "@/state-hooks/use-shop-order-state";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type TShopCatalog = TGetShopCatalogOutput["data"];
type TShopAvailability = TShopCatalog["disponibilidade"];

// Split contexts so the hot path (product cards, catalog views) doesn't re-render
// on every cart/checkout state change: data changes rarely, actions never change,
// and only the sheets/steps subscribe to the order context.
type TShopDataContextValue = {
	orgId: string;
	catalog: TShopCatalog;
	availability: TShopAvailability;
};

type TShopActionsContextValue = {
	addItem: TUseShopOrderState["addItem"];
	setBuilderProduct: (product: TShopCatalogProduct | null) => void;
	openBuilderForEdit: (product: TShopCatalogProduct, item: TShopCartItem) => void;
	setIsCartOpen: (open: boolean) => void;
	setIsCheckoutOpen: (open: boolean) => void;
};

type TShopOrderContextValue = {
	orderState: TUseShopOrderState;
	builderProduct: TShopCatalogProduct | null;
	builderEditItem: TShopCartItem | null;
	isCartOpen: boolean;
	isCheckoutOpen: boolean;
};

const ShopDataContext = createContext<TShopDataContextValue | null>(null);
const ShopActionsContext = createContext<TShopActionsContextValue | null>(null);
const ShopOrderContext = createContext<TShopOrderContextValue | null>(null);

type ShopProviderProps = {
	orgId: string;
	catalog: TShopCatalog;
	children: ReactNode;
};

export function ShopProvider({ orgId, catalog, children }: ShopProviderProps) {
	const orderState = useShopOrderState({ orgId, mode: catalog.shopSettings.modo });
	const [builderProduct, setBuilderProductState] = useState<TShopCatalogProduct | null>(null);
	const [builderEditItem, setBuilderEditItem] = useState<TShopCartItem | null>(null);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

	const { data: availability } = useShopAvailability({ orgId, initialData: catalog.disponibilidade });

	const setBuilderProduct = useCallback((product: TShopCatalogProduct | null) => {
		setBuilderProductState(product);
		setBuilderEditItem(null);
	}, []);

	const openBuilderForEdit = useCallback((product: TShopCatalogProduct, item: TShopCartItem) => {
		setBuilderProductState(product);
		setBuilderEditItem(item);
	}, []);

	const dataValue = useMemo<TShopDataContextValue>(
		() => ({ orgId, catalog, availability: availability ?? catalog.disponibilidade }),
		[orgId, catalog, availability],
	);

	const actionsValue = useMemo<TShopActionsContextValue>(
		() => ({ addItem: orderState.addItem, setBuilderProduct, openBuilderForEdit, setIsCartOpen, setIsCheckoutOpen }),
		[orderState.addItem, setBuilderProduct, openBuilderForEdit],
	);

	const orderValue = useMemo<TShopOrderContextValue>(
		() => ({ orderState, builderProduct, builderEditItem, isCartOpen, isCheckoutOpen }),
		[orderState, builderProduct, builderEditItem, isCartOpen, isCheckoutOpen],
	);

	return (
		<ShopDataContext.Provider value={dataValue}>
			<ShopActionsContext.Provider value={actionsValue}>
				<ShopOrderContext.Provider value={orderValue}>{children}</ShopOrderContext.Provider>
			</ShopActionsContext.Provider>
		</ShopDataContext.Provider>
	);
}

export function useShopData() {
	const context = useContext(ShopDataContext);
	if (!context) {
		throw new Error("useShopData must be used within a ShopProvider");
	}
	return context;
}

export function useShopActions() {
	const context = useContext(ShopActionsContext);
	if (!context) {
		throw new Error("useShopActions must be used within a ShopProvider");
	}
	return context;
}

// Full-fat hook for the sheets/checkout steps, which need the order state anyway.
// Hot-path components (cards, views, header) should prefer useShopData/useShopActions.
export function useShop() {
	const data = useShopData();
	const actions = useShopActions();
	const order = useContext(ShopOrderContext);
	if (!order) {
		throw new Error("useShop must be used within a ShopProvider");
	}
	return {
		orgId: data.orgId,
		catalog: data.catalog,
		availability: data.availability,
		orderState: order.orderState,
		builderProduct: order.builderProduct,
		builderEditItem: order.builderEditItem,
		setBuilderProduct: actions.setBuilderProduct,
		openBuilderForEdit: actions.openBuilderForEdit,
		isCartOpen: order.isCartOpen,
		setIsCartOpen: actions.setIsCartOpen,
		isCheckoutOpen: order.isCheckoutOpen,
		setIsCheckoutOpen: actions.setIsCheckoutOpen,
	};
}
