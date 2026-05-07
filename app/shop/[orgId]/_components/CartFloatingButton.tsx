"use client";

import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { useShop } from "./ShopProvider";

export default function CartFloatingButton() {
	const { catalog, orderState, setIsCartOpen } = useShop();
	const { items } = orderState.state.cart;

	const itemCount = items.reduce((sum, item) => sum + item.quantidade, 0);

	const subtotal = useMemo(() => {
		let total = 0;
		for (const item of items) {
			const product = catalog.products.find((p) => p.id === item.produtoId);
			if (!product) continue;

			let unitPrice = product.precoVenda ?? 0;
			if (item.produtoVarianteId) {
				const variant = product.variantes.find((v) => v.id === item.produtoVarianteId);
				if (variant) unitPrice = variant.precoVenda ?? 0;
			}

			let modifiersPrice = 0;
			for (const modifier of item.modificadores) {
				const allReferences = [...product.addOnsReferencias];
				const variant = product.variantes.find((v) => v.id === item.produtoVarianteId);
				if (variant) allReferences.push(...variant.addOnsReferencias);

				for (const ref of allReferences) {
					const option = ref.grupo.opcoes.find((o) => o.id === modifier.opcaoId);
					if (option) {
						modifiersPrice += option.precoDelta * modifier.quantidade;
					}
				}
			}

			total += (unitPrice + modifiersPrice) * item.quantidade;
		}
		return total;
	}, [items, catalog.products]);

	if (itemCount === 0) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
			<Button
				className="w-full h-14 rounded-2xl shadow-lg gap-3 text-base font-bold"
				onClick={() => setIsCartOpen(true)}
			>
				<div className="relative">
					<ShoppingCart className="w-5 h-5" />
					<span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background text-primary text-xs font-black flex items-center justify-center">
						{itemCount}
					</span>
				</div>
				<span className="flex-1 text-left">Ver carrinho</span>
				<span className="font-black">{formatToMoney(subtotal)}</span>
			</Button>
		</div>
	);
}
