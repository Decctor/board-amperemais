"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatToMoney } from "@/lib/formatting";
import { buildShopCartLines } from "@/lib/shop/cart";
import { Minus, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { useShop } from "./ShopProvider";

export default function CartSheet() {
	const { catalog, availability, orderState, isCartOpen, setIsCartOpen, setIsCheckoutOpen, openBuilderForEdit } = useShop();
	const { items } = orderState.state.cart;
	const isOpen = availability.status === "ABERTA";

	const cartLines = useMemo(() => buildShopCartLines(items, catalog.products), [items, catalog.products]);

	const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
	const itemCount = items.reduce((sum, item) => sum + item.quantidade, 0);

	const handleCheckout = () => {
		setIsCartOpen(false);
		orderState.setCheckoutStep("CLIENTE");
		setIsCheckoutOpen(true);
	};

	const handleEditItem = (tempId: string | null) => {
		if (!tempId) return;
		const originalItem = items.find((item) => item.tempId === tempId);
		const line = cartLines.find((candidate) => candidate.tempId === tempId);
		if (!originalItem || !line) return;
		setIsCartOpen(false);
		openBuilderForEdit(line.product, originalItem);
	};

	return (
		<Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
			<DrawerContent className="flex max-h-[92dvh] flex-col">
				<DrawerHeader className="text-left">
					<DrawerTitle className="text-lg font-black flex items-center gap-2">
						<ShoppingCart className="w-5 h-5" />
						Carrinho
					</DrawerTitle>
					<DrawerDescription>{itemCount === 0 ? "Seu carrinho está vazio" : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}</DrawerDescription>
				</DrawerHeader>

				{itemCount === 0 ? (
					<div className="px-4 pb-8 flex flex-col items-center gap-4 text-center">
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
							<ShoppingCart className="w-10 h-10 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">Adicione produtos para começar.</p>
						<Button variant="outline" onClick={() => setIsCartOpen(false)}>
							CONTINUAR COMPRANDO
						</Button>
					</div>
				) : (
					<>
						<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0">
							<div className="flex flex-col gap-3 pb-4">
								{cartLines.map((item) => {
									return (
										<div key={item.tempId} className="flex gap-3 p-3 rounded-xl border bg-card">
											{item.imageUrl ? (
												<div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
													<Image src={item.imageUrl} alt={item.displayName} fill className="object-cover" sizes="64px" />
												</div>
											) : (
												<div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
													<span className="text-xl font-black text-muted-foreground/50">{item.displayName.charAt(0).toUpperCase()}</span>
												</div>
											)}

											<div className="flex-1 min-w-0 flex flex-col">
												<div className="flex items-start justify-between gap-2">
													<h4 className="font-semibold text-sm line-clamp-1">{item.displayName}</h4>
													{item.product.variantes.length > 0 || item.product.addOnsReferencias.length > 0 ? (
														<Button
															size="icon"
															variant="ghost"
															className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-lg text-muted-foreground"
															aria-label={`Editar ${item.displayName}`}
															onClick={() => handleEditItem(item.tempId)}
															disabled={!isOpen}
														>
															<Pencil className="h-3.5 w-3.5" />
														</Button>
													) : null}
												</div>

												{item.modifiersDetails.length > 0 && (
													<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
														{item.modifiersDetails.map((m) => (m.quantidade > 1 ? `${m.quantidade}x ${m.nome}` : m.nome)).join(", ")}
													</p>
												)}

												<div className="flex items-center justify-between mt-auto pt-2">
													<div className="flex items-center gap-1">
														<Button
															size="icon"
															variant="ghost"
															className="h-9 w-9 rounded-lg"
															aria-label={item.quantidade <= 1 ? `Remover ${item.displayName}` : "Diminuir quantidade"}
															onClick={() => {
																if (item.quantidade <= 1) {
																	orderState.removeItem(item.tempId!);
																} else {
																	orderState.updateItemQuantity(item.tempId!, item.quantidade - 1);
																}
															}}
															disabled={!isOpen}
														>
															{item.quantidade <= 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
														</Button>
														<span className="w-6 text-center font-bold text-sm">{item.quantidade}</span>
														<Button
															size="icon"
															variant="ghost"
															className="h-9 w-9 rounded-lg"
															aria-label="Aumentar quantidade"
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

						<div className="border-t flex flex-col gap-3 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
							{!isOpen ? (
								<p className="text-sm text-muted-foreground">Seu carrinho está salvo. Volte durante o horário de atendimento para finalizar o pedido.</p>
							) : null}
							<div className="flex items-center justify-between">
								<span className="font-semibold">Subtotal</span>
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
