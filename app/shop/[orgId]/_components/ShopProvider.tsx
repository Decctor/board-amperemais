"use client";

import type { TGetShopCatalogOutput } from "@/app/api/shop/[orgId]/catalog/route";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { type TUseShopOrderState, useShopOrderState } from "@/state-hooks/use-shop-order-state";
import { createContext, useContext, useState, type ReactNode } from "react";

type TShopCatalog = TGetShopCatalogOutput["data"];

type TShopContextValue = {
	orgId: string;
	catalog: TShopCatalog;
	orderState: TUseShopOrderState;
	builderProduct: TShopCatalogProduct | null;
	setBuilderProduct: (product: TShopCatalogProduct | null) => void;
	isCartOpen: boolean;
	setIsCartOpen: (open: boolean) => void;
	isCheckoutOpen: boolean;
	setIsCheckoutOpen: (open: boolean) => void;
};

const ShopContext = createContext<TShopContextValue | null>(null);

type ShopProviderProps = {
	orgId: string;
	catalog: TShopCatalog;
	children: ReactNode;
};

export function ShopProvider({ orgId, catalog, children }: ShopProviderProps) {
	const orderState = useShopOrderState({ orgId, mode: catalog.shopSettings.modo });
	const [builderProduct, setBuilderProduct] = useState<TShopCatalogProduct | null>(null);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

	return (
		<ShopContext.Provider
			value={{
				orgId,
				catalog,
				orderState,
				builderProduct,
				setBuilderProduct,
				isCartOpen,
				setIsCartOpen,
				isCheckoutOpen,
				setIsCheckoutOpen,
			}}
		>
			{children}
		</ShopContext.Provider>
	);
}

export function useShop() {
	const context = useContext(ShopContext);
	if (!context) {
		throw new Error("useShop must be used within a ShopProvider");
	}
	return context;
}
