"use client";

import { useShop } from "./ShopProvider";
import ShopHeader from "./ShopHeader";
import MenuModeView from "./MenuModeView";
import CatalogModeView from "./CatalogModeView";
import CartSheet from "./CartSheet";
import CheckoutSheet from "./CheckoutSheet";
import ProductBuilderSheet from "./ProductBuilderSheet";
import OrderSuccessView from "./OrderSuccessView";
import CartFloatingButton from "./CartFloatingButton";

export default function ShopShell() {
	const { catalog, orderState, builderProduct, setBuilderProduct } = useShop();

	if (orderState.state.checkoutStep === "SUCESSO") {
		return <OrderSuccessView />;
	}

	return (
		<div
			className="min-h-screen bg-background"
			style={
				{
					"--shop-primary": catalog.organization.corPrimaria || "hsl(var(--primary))",
					"--shop-primary-foreground": catalog.organization.corPrimariaForeground || "hsl(var(--primary-foreground))",
					"--shop-secondary": catalog.organization.corSecundaria || "hsl(var(--secondary))",
					"--shop-secondary-foreground": catalog.organization.corSecundariaForeground || "hsl(var(--secondary-foreground))",
				} as React.CSSProperties
			}
		>
			<ShopHeader />

			<main className="pb-24">
				{catalog.shopSettings.modo === "CARDAPIO" ? <MenuModeView /> : <CatalogModeView />}
			</main>

			<CartFloatingButton />
			<CartSheet />
			<CheckoutSheet />
			{builderProduct && <ProductBuilderSheet product={builderProduct} onClose={() => setBuilderProduct(null)} />}
		</div>
	);
}
