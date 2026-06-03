"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatToMoney } from "@/lib/formatting";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { useShop } from "./ShopProvider";

export default function CartSheet() {
	const { catalog, orderState, isCartOpen, setIsCartOpen, setIsCheckoutOpen } = useShop();
	const { items } = orderState.state.cart;
	const isOpen = catalog.disponibilidade.status === "ABERTA";

	const cartItemsWithDetails = useMemo(() => {
		return items
			.map((item) => {
				const product = catalog.products.find((p) => p.id === item.produtoId);
				if (!product) return null;

				const variant = item.produtoVarianteId ? product.variantes.find((v) => v.id === item.produtoVarianteId) : null;

				let unitPrice = variant?.precoVenda ?? product.precoVenda ?? 0;

				const allReferences = [...product.addOnsReferencias, ...(variant?.addOnsReferencias ?? [])];
				const modifiersDetails = item.modificadores
					.map((mod) => {
						for (const ref of allReferences) {
							const option = ref.grupo.opcoes.find((o) => o.id === mod.opcaoId);
							if (option) {
								return {
									nome: option.nome,
									quantidade: mod.quantidade,
									precoDelta: option.precoDelta,
								};
							}
						}
						return null;
					})
					.filter(Boolean);

				const modifiersPrice = modifiersDetails.reduce((sum, mod) => sum + (mod?.precoDelta ?? 0) * (mod?.quantidade ?? 1), 0);

				const lineTotal = (unitPrice + modifiersPrice) * item.quantidade;

				return {
					...item,
					product,
					variant,
					unitPrice,
					modifiersPrice,
					modifiersDetails,
					lineTotal,
					displayName: variant ? `${product.nome} - ${variant.nome}` : product.nome,
					imageUrl: variant?.imagemCapaUrl ?? product.imagemCapaUrl,
				};
			})
			.filter(Boolean);
	}, [items, catalog.products]);

	const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + (item?.lineTotal ?? 0), 0);
	const itemCount = items.reduce((sum, item) => sum + item.quantidade, 0);

	const handleCheckout = () => {
		setIsCartOpen(false);
		orderState.setCheckoutStep("CLIENTE");
		setIsCheckoutOpen(true);
	};

	return (
		<Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
			<DrawerContent className="flex flex-col min-h-[95vh]">
				<DrawerHeader className="text-left">
					<DrawerTitle className="text-lg font-black flex items-center gap-2">
						<ShoppingCart className="w-5 h-5" />
						CARRINHO
					</DrawerTitle>
					<DrawerDescription>{itemCount === 0 ? "Seu carrinho está vazio" : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}</DrawerDescription>
				</DrawerHeader>

				{itemCount === 0 ? (
					<div className="px-4 pb-8 flex flex-col items-center gap-4 text-center">
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
							<ShoppingCart className="w-10 h-10 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">Adicione produtos para comecar.</p>
						<Button variant="outline" onClick={() => setIsCartOpen(false)}>
							CONTINUAR COMPRANDO
						</Button>
					</div>
				) : (
					<>
						<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0">
							<div className="flex flex-col gap-3 pb-4">
								{cartItemsWithDetails.map((item) => {
									if (!item) return null;
									return (
										<div key={item.tempId} className="flex gap-3 p-3 rounded-xl border bg-card">
											{item.imageUrl ? (
												<div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
													<Image src={item.imageUrl} alt={item.displayName} fill className="object-cover" />
												</div>
											) : (
												<div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
													<span className="text-xl font-black text-muted-foreground/50">{item.displayName.charAt(0).toUpperCase()}</span>
												</div>
											)}

											<div className="flex-1 min-w-0 flex flex-col">
												<h4 className="font-semibold text-sm line-clamp-1">{item.displayName}</h4>

												{item.modifiersDetails.length > 0 && (
													<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
														{item.modifiersDetails.map((m) => ((m?.quantidade ?? 1) > 1 ? `${m?.quantidade}x ${m?.nome}` : m?.nome)).join(", ")}
													</p>
												)}

												<div className="flex items-center justify-between mt-auto pt-2">
													<div className="flex items-center gap-1">
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 rounded-lg"
															onClick={() => {
																if (item.quantidade <= 1) {
																	orderState.removeItem(item.tempId!);
																} else {
																	orderState.updateItemQuantity(item.tempId!, item.quantidade - 1);
																}
															}}
															disabled={!isOpen}
														>
															{item.quantidade <= 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
														</Button>
														<span className="w-6 text-center font-bold text-sm">{item.quantidade}</span>
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 rounded-lg"
															onClick={() => orderState.updateItemQuantity(item.tempId!, item.quantidade + 1)}
															disabled={!isOpen}
														>
															<Plus className="w-3.5 h-3.5" />
														</Button>
													</div>

													<span className="font-black text-primary">{formatToMoney(item.lineTotal)}</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="p-4 border-t flex flex-col gap-3">
							{!isOpen ? (
								<p className="text-sm text-muted-foreground">Seu carrinho está salvo. Volte durante o horário de atendimento para finalizar o pedido.</p>
							) : null}
							<div className="flex items-center justify-between">
								<span className="font-semibold">SUBTOTAL</span>
								<span className="text-xl font-black text-primary">{formatToMoney(subtotal)}</span>
							</div>

							<Button variant="brand" className="flex items-center gap-1.5 w-full h-12 rounded-xl font-bold" onClick={handleCheckout} disabled={!isOpen}>
								<ShoppingCart className="h-4 w-4" />
								FINALIZAR PEDIDO
							</Button>
						</div>
					</>
				)}
			</DrawerContent>
		</Drawer>
	);
}
