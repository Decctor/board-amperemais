import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TGetPOSProductsOutput } from "@/pages/api/pos/products";
import type { TCartItem, TCartItemModifier } from "@/state-hooks/use-sale-state";
import { Check, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type ProductBuilderModalProps = {
	product: TGetPOSProductsOutput["data"]["products"][number];
	onAddToCart: (item: TCartItem) => void;
	onClose: () => void;
};

type SelectedModifier = {
	opcaoId: string;
	quantidade: number;
};

export default function ProductBuilderModal({ product, onAddToCart, onClose }: ProductBuilderModalProps) {
	console.log("PRODUCT_BUILDER_MODAL", product);
	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
	const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
	const [quantity, setQuantity] = useState(1);

	const hasVariants = product.variantes && product.variantes.length > 0;
	const hasAddOns = product.addOnsReferencias && product.addOnsReferencias.length > 0;

	// Auto-select first variant if only one exists
	useEffect(() => {
		if (hasVariants && product.variantes.length === 1 && !selectedVariantId) {
			setSelectedVariantId(product.variantes[0].id);
		}
	}, [hasVariants, product.variantes, selectedVariantId]);

	// Calculate base price
	const getBasePrice = () => {
		if (selectedVariantId) {
			const variant = product.variantes.find((v) => v.id === selectedVariantId);
			return variant?.precoVenda ?? 0;
		}
		return product.precoVenda ?? 0;
	};

	// Calculate modifiers total
	const getModifiersTotal = () => {
		let total = 0;
		for (const selected of selectedModifiers) {
			for (const reference of product.addOnsReferencias) {
				const option = reference.grupo.opcoes.find((o) => o.id === selected.opcaoId);
				if (option) {
					total += option.precoDelta * selected.quantidade;
				}
			}
		}
		return total;
	};

	// Calculate final price
	const getFinalPrice = () => {
		const base = getBasePrice();
		const modifiers = getModifiersTotal();
		return (base + modifiers) * quantity;
	};

	// Check if requirements are met
	const canAddToCart = () => {
		// If has variants, one must be selected
		if (hasVariants && !selectedVariantId) return false;

		// Check if all required add-on groups are satisfied
		for (const reference of product.addOnsReferencias) {
			const grupo = reference.grupo;
			if (grupo.minOpcoes > 0) {
				// Count how many options from this group are selected
				const selectedFromGroup = selectedModifiers.filter((sm) => grupo.opcoes.some((o) => o.id === sm.opcaoId));
				const totalQuantity = selectedFromGroup.reduce((sum, sm) => sum + sm.quantidade, 0);
				if (totalQuantity < grupo.minOpcoes) {
					return false;
				}
			}
		}

		return true;
	};

	// Handle modifier toggle
	const toggleModifier = (opcaoId: string, groupMaxOpcoes: number) => {
		setSelectedModifiers((prev) => {
			const exists = prev.find((m) => m.opcaoId === opcaoId);
			if (exists) {
				// Remove it
				return prev.filter((m) => m.opcaoId !== opcaoId);
			}

			// For radio-style (maxOpcoes === 1), clear other options from the same group first
			if (groupMaxOpcoes === 1) {
				// Find which group this option belongs to
				const belongsToGroup = product.addOnsReferencias.find((ref) => ref.grupo.opcoes.some((o) => o.id === opcaoId));
				if (belongsToGroup) {
					const otherOptionsInGroup = belongsToGroup.grupo.opcoes.map((o) => o.id);
					return [...prev.filter((m) => !otherOptionsInGroup.includes(m.opcaoId)), { opcaoId, quantidade: 1 }];
				}
			}

			// Add it
			return [...prev, { opcaoId, quantidade: 1 }];
		});
	};

	// Update modifier quantity
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
				.filter((m) => m.quantidade > 0),
		);
	};

	// Handle add to cart
	const handleAddToCart = () => {
		const basePrice = getBasePrice();
		const modifiersPrice = getModifiersTotal();
		const unitFinal = basePrice + modifiersPrice;

		// Build modifiers array
		const modifiers: TCartItemModifier[] = [];
		for (const selected of selectedModifiers) {
			for (const reference of product.addOnsReferencias) {
				const option = reference.grupo.opcoes.find((o) => o.id === selected.opcaoId);
				if (option) {
					modifiers.push({
						opcaoId: option.id,
						nome: option.nome,
						quantidade: selected.quantidade,
						valorUnitario: option.precoDelta,
						valorTotal: option.precoDelta * selected.quantidade,
					});
				}
			}
		}

		// Get variant name if selected
		const selectedVariant = selectedVariantId ? product.variantes.find((v) => v.id === selectedVariantId) : null;
		const itemName = selectedVariant ? `${product.descricao} - ${selectedVariant.nome}` : product.descricao;

		const cartItem: TCartItem = {
			tempId: crypto.randomUUID(),
			produtoId: product.id,
			produtoVarianteId: selectedVariantId,
			nome: itemName,
			codigo: selectedVariant?.codigo ?? product.codigo,
			imagemUrl: selectedVariant?.imagemCapaUrl ?? product.imagemCapaUrl,
			quantidade: quantity,
			valorUnitarioBase: basePrice,
			valorModificadores: modifiersPrice,
			valorUnitarioFinal: unitFinal,
			valorTotalBruto: unitFinal * quantity,
			valorDesconto: 0,
			valorTotalLiquido: unitFinal * quantity,
			modificadores: modifiers,
		};

		onAddToCart(cartItem);
		onClose();
	};

	return (
		<ResponsiveMenu
			menuTitle={product.descricao}
			menuDescription="Configure seu produto"
			menuActionButtonText="ADICIONAR AO CARRINHO"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleAddToCart}
			closeMenu={onClose}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			dialogVariant="md"
			menuActionButtonClassName={cn(!canAddToCart() && "opacity-50 cursor-not-allowed")}
		>
			<div className="flex flex-col gap-6">
				{/* Product Image */}
				{(product.imagemCapaUrl || selectedVariantId) && (
					<div className="relative w-full h-48 rounded-2xl overflow-hidden bg-secondary/50 flex items-center justify-center">
						{product.imagemCapaUrl ? (
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
						) : null}
					</div>
				)}

				{/* Section A: Variant Selector */}
				{hasVariants && (
					<div className="flex flex-col gap-3">
						<h3 className="font-black text-sm uppercase tracking-wide">Escolha o Tamanho/Variante</h3>
						<ScrollArea className="w-full">
							<div className="flex gap-2 pb-2">
								{product.variantes.map((variant) => (
									<Button
										key={variant.id}
										variant={selectedVariantId === variant.id ? "default" : "outline"}
										onClick={() => setSelectedVariantId(variant.id)}
										className={cn(
											"flex-shrink-0 h-auto py-4 px-6 rounded-xl flex flex-col items-center gap-2 min-w-[120px]",
											selectedVariantId === variant.id && "ring-2 ring-primary ring-offset-2",
										)}
									>
										<span className="font-bold">{variant.nome}</span>
										<span className="text-xs font-black">{formatToMoney(variant.precoVenda)}</span>
										{selectedVariantId === variant.id && <Check className="w-4 h-4" />}
									</Button>
								))}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Section B: Add-Ons/Modifiers */}
				{hasAddOns && (
					<div className="flex flex-col gap-4">
						{product.addOnsReferencias.map((reference) => {
							const grupo = reference.grupo;
							const isRequired = grupo.minOpcoes > 0;
							const isRadioStyle = grupo.maxOpcoes === 1;

							// Count selected from this group
							const selectedFromGroup = selectedModifiers.filter((sm) => grupo.opcoes.some((o) => o.id === sm.opcaoId));
							const isSatisfied = selectedFromGroup.reduce((sum, sm) => sum + sm.quantidade, 0) >= grupo.minOpcoes;

							return (
								<div
									key={reference.produtoAddOnId}
									className={cn(
										"border-2 rounded-2xl p-4 transition-colors",
										isRequired && !isSatisfied ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" : "border-border",
									)}
								>
									<div className="flex items-center justify-between mb-3">
										<h4 className="font-bold text-sm">
											{grupo.nome}
											{isRequired && <span className="text-red-500 ml-1">*</span>}
										</h4>
										<span className="text-xs text-muted-foreground">
											{isRadioStyle ? "Escolha 1" : grupo.maxOpcoes > 1 ? `Até ${grupo.maxOpcoes}` : "Múltipla escolha"}
										</span>
									</div>

									<div className="flex flex-col gap-2">
										{isRadioStyle ? (
											// Radio Style
											<RadioGroup value={selectedFromGroup[0]?.opcaoId ?? ""}>
												{grupo.opcoes.map((option) => {
													const isSelected = selectedModifiers.some((m) => m.opcaoId === option.id);
													return (
														<div key={option.id} className="flex items-center space-x-2">
															<RadioGroupItem value={option.id} id={option.id} onClick={() => toggleModifier(option.id, grupo.maxOpcoes)} checked={isSelected} />
															<Label htmlFor={option.id} className="flex-1 flex justify-between cursor-pointer py-2">
																<span className="font-medium">{option.nome}</span>
																{option.precoDelta !== 0 && <span className="text-sm font-bold text-primary">+{formatToMoney(option.precoDelta)}</span>}
															</Label>
														</div>
													);
												})}
											</RadioGroup>
										) : (
											// Checkbox/Counter Style
											<div className="flex flex-col gap-2">
												{grupo.opcoes.map((option) => {
													const selected = selectedModifiers.find((m) => m.opcaoId === option.id);
													const isSelected = !!selected;
													const maxQty = option.maxQtdePorItem ?? 1;

													return (
														<div key={option.id} className="flex items-center justify-between py-2">
															<div className="flex items-center gap-2 flex-1">
																<Checkbox id={option.id} checked={isSelected} onCheckedChange={() => toggleModifier(option.id, grupo.maxOpcoes)} />
																<Label htmlFor={option.id} className="cursor-pointer font-medium">
																	{option.nome}
																</Label>
																{option.precoDelta !== 0 && <span className="text-sm font-bold text-primary">+{formatToMoney(option.precoDelta)}</span>}
															</div>

															{/* Quantity Stepper if maxQtdePorItem > 1 */}
															{isSelected && maxQty > 1 && (
																<div className="flex items-center gap-2">
																	<Button
																		size="icon"
																		variant="outline"
																		className="h-8 w-8 rounded-lg"
																		onClick={() => updateModifierQuantity(option.id, -1)}
																		disabled={!selected || selected.quantidade <= 1}
																	>
																		<Minus className="w-3 h-3" />
																	</Button>
																	<span className="w-8 text-center font-bold">{selected?.quantidade ?? 1}</span>
																	<Button
																		size="icon"
																		variant="outline"
																		className="h-8 w-8 rounded-lg"
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

				{/* Section C: Footer Actions */}
				<div className="flex flex-col gap-4 border-t pt-4">
					{/* Quantity Stepper */}
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm">Quantidade</span>
						<div className="flex items-center gap-3">
							<Button size="icon" variant="outline" className="h-10 w-10 rounded-lg" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
								<Minus className="w-4 h-4" />
							</Button>
							<span className="w-12 text-center font-black text-lg">{quantity}</span>
							<Button size="icon" variant="outline" className="h-10 w-10 rounded-lg" onClick={() => setQuantity((q) => q + 1)}>
								<Plus className="w-4 h-4" />
							</Button>
						</div>
					</div>

					{/* Total */}
					<div className="bg-primary/10 rounded-2xl p-4 flex items-center justify-between">
						<span className="font-bold text-sm uppercase tracking-wide">Total</span>
						<span className="text-2xl font-black text-primary">{formatToMoney(getFinalPrice())}</span>
					</div>

					{/* Validation Message */}
					{!canAddToCart() && (
						<p className="text-xs text-red-500 font-medium text-center">
							{!selectedVariantId && hasVariants ? "Selecione uma variante" : "Complete as seleções obrigatórias (*) para continuar"}
						</p>
					)}
				</div>
			</div>
		</ResponsiveMenu>
	);
}
