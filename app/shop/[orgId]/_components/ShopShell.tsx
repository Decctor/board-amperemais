"use client";

import dynamic from "next/dynamic";
import CartFloatingButton from "./CartFloatingButton";
import CartSheet from "./CartSheet";
import CatalogModeView from "./CatalogModeView";
import MenuModeView from "./MenuModeView";
import ShopAvailabilityNotice from "./ShopAvailabilityNotice";
import ShopHeader from "./ShopHeader";
import { useShop, useShopData } from "./ShopProvider";

// Split the heavy interaction flows out of the initial bundle: the checkout only
// loads after hydration and the builder only on the first product tap.
const CheckoutSheet = dynamic(() => import("./CheckoutSheet"), { ssr: false });
const ProductBuilderSheet = dynamic(() => import("./ProductBuilderSheet"), { ssr: false });

export default function ShopShell() {
	const { catalog } = useShopData();

	return (
		<div className="min-h-screen bg-background">
			<ShopHeader />
			<ShopAvailabilityNotice />

			<main className="pb-24">{catalog.shopSettings.modo === "CARDAPIO" ? <MenuModeView /> : <CatalogModeView />}</main>

			<CartFloatingButton />
			<CartSheet />
			<CheckoutSheet />
			<ProductBuilderSheetHost />
		</div>
	);
}

function ProductBuilderSheetHost() {
	const { builderProduct, builderEditItem, setBuilderProduct, setIsCartOpen } = useShop();
	if (!builderProduct) return null;
	const wasEditing = !!builderEditItem;
	return (
		<ProductBuilderSheet
			product={builderProduct}
			editItem={builderEditItem}
			onClose={() => {
				setBuilderProduct(null);
				if (wasEditing) setIsCartOpen(true);
			}}
		/>
	);
}
