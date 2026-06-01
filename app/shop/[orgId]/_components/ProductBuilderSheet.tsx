"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatToMoney } from "@/lib/formatting";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShop } from "./ShopProvider";

type ProductBuilderSheetProps = {
	product: TShopCatalogProduct;
	onClose: () => void;
};

type SelectedModifier = {
	opcaoId: string;
	quantidade: number;
};

export default function ProductBuilderSheet({ product, onClose }: ProductBuilderSheetProps) {
	const { orderState } = useShop();

	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
	const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
	const [quantity, setQuantity] = useState(1);

	const selectedVariant = selectedVariantId ? product.variantes.find((v) => v.id === selectedVariantId) : null;
	const availableReferences = [...product.addOnsReferencias, ...(selectedVariant?.addOnsReferencias ?? [])];

	const hasVariants = product.variantes.length > 0;
	const hasAddOns = availableReferences.length > 0;

	useEffect(() => {
		if (hasVariants && product.variantes.length === 1 && !selectedVariantId) {
			setSelectedVariantId(product.variantes[0].id);
		}
	}, [hasVariants, product.variantes, selectedVariantId]);

	const getBasePrice = () => {
		if (selectedVariantId) {
			const variant = product.variantes.find((v) => v.id === selectedVariantId);
			return variant?.precoVenda ?? 0;
		}
		return product.precoVenda ?? 0;
	};

	const getModifiersTotal = () => {
		let total = 0;
		for (const selected of selectedModifiers) {
			for (const reference of availableReferences) {
				const option = reference.grupo.opcoes.find((o) => o.id === selected.opcaoId);
				if (option) {
					total += option.precoDelta * selected.quantidade;
				}
			}
		}
		return total;
	};

	const getFinalPrice = () => {
		const base = getBasePrice();
		const modifiers = getModifiersTotal();
		return (base + modifiers) * quantity;
	};

	const canAddToCart = () => {
		if (hasVariants && !selectedVariantId) return false;

		for (const reference of availableReferences) {
			const grupo = reference.grupo;
			if (grupo.minOpcoes > 0) {
				const selectedFromGroup = selectedModifiers.filter((sm) => grupo.opcoes.some((o) => o.id === sm.opcaoId));
				const totalQuantity = selectedFromGroup.reduce((sum, sm) => sum + sm.quantidade, 0);
				if (totalQuantity < grupo.minOpcoes) {
					return false;
				}
			}
		}

		return true;
	};

	const toggleModifier = (opcaoId: string, groupMaxOpcoes: number) => {
		setSelectedModifiers((prev) => {
			const exists = prev.find((m) => m.opcaoId === opcaoId);
			if (exists) {
				return prev.filter((m) => m.opcaoId !== opcaoId);
			}

			if (groupMaxOpcoes === 1) {
				const belongsToGroup = availableReferences.find((ref) => ref.grupo.opcoes.some((o) => o.id === opcaoId));
				if (belongsToGroup) {
					const otherOptionsInGroup = belongsToGroup.grupo.opcoes.map((o) => o.id);
					return [...prev.filter((m) => !otherOptionsInGroup.includes(m.opcaoId)), { opcaoId, quantidade: 1 }];
				}
			}

			return [...prev, { opcaoId, quantidade: 1 }];
		});
	};

	const updateModifierQuantity = (opcaoId: string, delta: number) => {
		setSelectedModifiers((prev) =>
			prev
				.map((m) => {
					if (m.opcaoId === opcaoId) {
						const newQty = m.quantidade + delta;
						return { ...m, quantidade: newQty };
					}
					return m;
				})
				.filter((m) => m.quantidade > 0)
		);
	};

	const handleAddToCart = () => {
		if (!canAddToCart()) return;

		orderState.addItem({
			tempId: crypto.randomUUID(),
			produtoId: product.id,
			produtoVarianteId: selectedVariantId,
			quantidade: quantity,
			modificadores: selectedModifiers,
		});

		const itemName = selectedVariant ? `${product.descricao} - ${selectedVariant.nome}` : product.descricao;
		toast.success(`${itemName} adicionado ao carrinho.`);
		onClose();
	};

	return (
		<Drawer open onOpenChange={(open) => !open && onClose()}>
			<DrawerContent className="max-h-[90vh]">
				<DrawerHeader className="text-left">
					<DrawerTitle className="text-lg font-black">{product.descricao}</DrawerTitle>
					<DrawerDescription>Configure as opcoes do produto</DrawerDescription>
				</DrawerHeader>

				<ScrollArea className="flex-1 overflow-auto px-4">
					<div className="flex flex-col gap-6 pb-4">
						{product.imagemCapaUrl && (
							<div className="relative w-full h-48 rounded-xl overflow-hidden bg-muted">
								<Image
									src={
										selectedVariantId
											? (product.variantes.find((v) => v.id === selectedVariantId)?.imagemCapaUrl ?? product.imagemCapaUrl)
											: product.imagemCapaUrl
									}
									alt={product.descricao}
									fill
									className="object-cover"
								/>
							</div>
						)}

						{hasVariants && (
							<div className="flex flex-col gap-3">
								<h3 className="font-black text-sm uppercase tracking-wide">Escolha a variante</h3>
								<div className="flex flex-wrap gap-2">
									{product.variantes.map((variant) => (
										<Button
											key={variant.id}
											variant={selectedVariantId === variant.id ? "default" : "outline"}
											onClick={() => setSelectedVariantId(variant.id)}
											className={cn(
												"h-auto py-3 px-4 rounded-xl flex flex-col items-center gap-1",
												selectedVariantId === variant.id && "ring-2 ring-primary"
											)}
										>
											<span className="font-bold text-sm">{variant.nome}</span>
											<span className="text-xs font-black">{formatToMoney(variant.precoVenda)}</span>
											{selectedVariantId === variant.id && <Check className="w-4 h-4" />}
										</Button>
									))}
								</div>
							</div>
						)}

						{hasAddOns && (
							<div className="flex flex-col gap-4">
								{availableReferences.map((reference) => {
									const grupo = reference.grupo;
									const isRequired = grupo.minOpcoes > 0;
									const isRadioStyle = grupo.maxOpcoes === 1;

									const selectedFromGroup = selectedModifiers.filter((sm) =>
										grupo.opcoes.some((o) => o.id === sm.opcaoId)
									);
									const isSatisfied =
										selectedFromGroup.reduce((sum, sm) => sum + sm.quantidade, 0) >= grupo.minOpcoes;

									return (
										<div
											key={reference.produtoAddOnId}
											className={cn(
												"border rounded-xl p-4 transition-colors",
												isRequired && !isSatisfied
													? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
													: "border-border"
											)}
										>
											<div className="flex items-center justify-between mb-3">
												<h4 className="font-bold text-sm">
													{grupo.nome}
													{isRequired && <span className="text-red-500 ml-1">*</span>}
												</h4>
												<span className="text-xs text-muted-foreground">
													{isRadioStyle
														? "Escolha 1"
														: grupo.maxOpcoes > 1
															? `Ate ${grupo.maxOpcoes}`
															: "Multipla escolha"}
												</span>
											</div>

											<div className="flex flex-col gap-2">
												{isRadioStyle ? (
													<RadioGroup value={selectedFromGroup[0]?.opcaoId ?? ""}>
														{grupo.opcoes.map((option) => {
															const isSelected = selectedModifiers.some((m) => m.opcaoId === option.id);
															return (
																<div key={option.id} className="flex items-center space-x-2">
																	<RadioGroupItem
																		value={option.id}
																		id={option.id}
																		onClick={() => toggleModifier(option.id, grupo.maxOpcoes)}
																		checked={isSelected}
																	/>
																	<Label
																		htmlFor={option.id}
																		className="flex-1 flex justify-between cursor-pointer py-2"
																	>
																		<span className="font-medium">{option.nome}</span>
																		{option.precoDelta !== 0 && (
																			<span className="text-sm font-bold text-primary">
																				+{formatToMoney(option.precoDelta)}
																			</span>
																		)}
																	</Label>
																</div>
															);
														})}
													</RadioGroup>
												) : (
													<div className="flex flex-col gap-2">
														{grupo.opcoes.map((option) => {
															const selected = selectedModifiers.find((m) => m.opcaoId === option.id);
															const isSelected = !!selected;
															const maxQty = option.maxQtdePorItem ?? 1;

															return (
																<div key={option.id} className="flex items-center justify-between py-2">
																	<div className="flex items-center gap-2 flex-1">
																		<Checkbox
																			id={option.id}
																			checked={isSelected}
																			onCheckedChange={() => toggleModifier(option.id, grupo.maxOpcoes)}
																		/>
																		<Label htmlFor={option.id} className="cursor-pointer font-medium">
																			{option.nome}
																		</Label>
																		{option.precoDelta !== 0 && (
																			<span className="text-sm font-bold text-primary">
																				+{formatToMoney(option.precoDelta)}
																			</span>
																		)}
																	</div>

																	{isSelected && maxQty > 1 && (
																		<div className="flex items-center gap-2">
																			<Button
																				size="icon"
																				variant="outline"
																				className="h-7 w-7 rounded-lg"
																				onClick={() => updateModifierQuantity(option.id, -1)}
																				disabled={!selected || selected.quantidade <= 1}
																			>
																				<Minus className="w-3 h-3" />
																			</Button>
																			<span className="w-6 text-center font-bold text-sm">
																				{selected?.quantidade ?? 1}
																			</span>
																			<Button
																				size="icon"
																				variant="outline"
																				className="h-7 w-7 rounded-lg"
																				onClick={() => updateModifierQuantity(option.id, 1)}
																				disabled={!selected || selected.quantidade >= maxQty}
																			>
																				<Plus className="w-3 h-3" />
																			</Button>
																		</div>
																	)}
																</div>
															);
														})}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}

						<div className="flex flex-col gap-4 border-t pt-4">
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm">Quantidade</span>
								<div className="flex items-center gap-3">
									<Button
										size="icon"
										variant="outline"
										className="h-9 w-9 rounded-lg"
										onClick={() => setQuantity((q) => Math.max(1, q - 1))}
									>
										<Minus className="w-4 h-4" />
									</Button>
									<span className="w-10 text-center font-black text-lg">{quantity}</span>
									<Button
										size="icon"
										variant="outline"
										className="h-9 w-9 rounded-lg"
										onClick={() => setQuantity((q) => q + 1)}
									>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
							</div>

							<div className="bg-primary/10 rounded-xl p-4 flex items-center justify-between">
								<span className="font-bold text-sm uppercase tracking-wide">Total</span>
								<span className="text-xl font-black text-primary">{formatToMoney(getFinalPrice())}</span>
							</div>

							{!canAddToCart() && (
								<p className="text-xs text-red-500 font-medium text-center">
									{!selectedVariantId && hasVariants
										? "Selecione uma variante"
										: "Complete as selecoes obrigatorias (*) para continuar"}
								</p>
							)}
						</div>
					</div>
				</ScrollArea>

				<div className="p-4 border-t">
					<Button
						className="w-full h-12 rounded-xl font-bold"
						onClick={handleAddToCart}
						disabled={!canAddToCart()}
					>
						Adicionar ao carrinho
					</Button>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
