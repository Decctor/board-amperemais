"use client";

import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { getShopCartSubtotal } from "@/lib/shop/cart";
import { ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { useShop } from "./ShopProvider";

export default function CartFloatingButton() {
	const { catalog, availability, orderState, setIsCartOpen } = useShop();
	const { items } = orderState.state.cart;

	const itemCount = items.reduce((sum, item) => sum + item.quantidade, 0);
	const subtotal = useMemo(() => getShopCartSubtotal(items, catalog.products), [items, catalog.products]);

	if (itemCount === 0) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)] sm:left-auto sm:right-4 sm:max-w-sm">
			<Button variant="brand" className="w-full h-14 rounded-2xl shadow-lg gap-3 text-base font-bold" onClick={() => setIsCartOpen(true)}>
				<div className="relative shrink-0">
					<ShoppingCart className="h-5 w-5" />
					<span
						key={itemCount}
						className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 animate-in zoom-in-50 items-center justify-center rounded-full bg-brand-secondary px-1 text-[10px] font-semibold tabular-nums leading-none text-brand-secondary-foreground ring-1 ring-brand-secondary/20 duration-300"
					>
						{itemCount > 99 ? "99+" : itemCount}
					</span>
				</div>
				<span className="flex-1 text-left">{availability.status === "ABERTA" ? "VER CARRINHO" : "CONSULTAR CARRINHO"}</span>
				<span className="font-black">{formatToMoney(subtotal)}</span>
			</Button>
		</div>
	);
}
