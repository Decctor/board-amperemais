import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TGetPOSProductsOutput } from "@/app/api/pos/products/route";
import type { TCartItem, TCartItemModifier } from "@/state-hooks/use-sale-state";
import { Check, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
	const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
	const [quantity, setQuantity] = useState(1);

	const selectedVariant = selectedVariantId ? product.variantes.find((v) => v.id === selectedVariantId) : null;
	const availableReferences = useMemo(
		() => [...product.addOnsReferencias, ...(selectedVariant?.addOnsReferencias ?? [])],
		[product.addOnsReferencias, selectedVariant],
	);

	const hasVariants = product.variantes.length > 0;
	const hasAddOns = availableReferences.length > 0;

	// Seleciona automaticamente a única variante existente.
	useEffect(() => {
		if (hasVariants && product.variantes.length === 1 && !selectedVariantId) {
			setSelectedVariantId(product.variantes[0].id);
		}
	}, [hasVariants, product.variantes, selectedVariantId]);

	const basePrice = selectedVariant?.precoVenda ?? product.precoVenda ?? 0;

	const modifiersTotal = useMemo(() => {
		let total = 0;
		for (const selected of selectedModifiers) {
			for (const reference of availableReferences) {
				const option = reference.grupo.opcoes.find((o) => o.id === selected.opcaoId);
				if (option) total += option.precoDelta * selected.quantidade;
			}
		}
		return total;
	}, [selectedModifiers, availableReferences]);

	const finalPrice = (basePrice + modifiersTotal) * quantity;

	// Total selecionado por grupo (soma das quantidades das opções escolhidas).
	const selectedCountForGroup = (grupo: TGrupo) =>
		selectedModifiers.filter((sm) => grupo.opcoes.some((o) => o.id === sm.opcaoId)).reduce((sum, sm) => sum + sm.quantidade, 0);

	// Primeira exigência não atendida — usado no aviso e no toast ao tentar confirmar.
	const blockReason = useMemo(() => {
		if (hasVariants && !selectedVariantId) return "Selecione uma variante para continuar.";
		for (const reference of availableReferences) {
			const grupo = reference.grupo;
			const total = selectedCountForGroup(grupo);
			if (grupo.minOpcoes > 0 && total < grupo.minOpcoes) {
				return grupo.minOpcoes > 1 ? `Escolha ao menos ${grupo.minOpcoes} opções em "${grupo.nome}".` : `Escolha uma opção em "${grupo.nome}".`;
			}
			if (grupo.maxOpcoes >= 1 && total > grupo.maxOpcoes) {
				return `Remova opções em "${grupo.nome}" (máximo ${grupo.maxOpcoes}).`;
			}
		}
		return null;
		// selectedCountForGroup depende de selectedModifiers/availableReferences, ambos nas deps.
	}, [hasVariants, selectedVariantId, availableReferences, selectedModifiers]);

	const canAddToCart = blockReason === null;

	// Alterna uma opção. Radio (maxOpcoes === 1) substitui a escolha do grupo.
	const toggleModifier = (opcaoId: string, groupMaxOpcoes: number) => {
		setSelectedModifiers((prev) => {
			const exists = prev.find((m) => m.opcaoId === opcaoId);
			if (exists) return prev.filter((m) => m.opcaoId !== opcaoId);

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
			prev.map((m) => (m.opcaoId === opcaoId ? { ...m, quantidade: m.quantidade + delta } : m)).filter((m) => m.quantidade > 0),
		);
	};

	const handleAddToCart = () => {
		if (blockReason) {
			toast.error(blockReason);
			return;
		}

		const unitFinal = basePrice + modifiersTotal;

		const modifiers: TCartItemModifier[] = [];
		for (const selected of selectedModifiers) {
			for (const reference of availableReferences) {
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

		const itemName = selectedVariant ? `${product.nome} - ${selectedVariant.nome}` : product.nome;

		onAddToCart({
			tempId: crypto.randomUUID(),
			produtoId: product.id,
			produtoVarianteId: selectedVariantId,
			nome: itemName,
			codigo: selectedVariant?.codigo ?? product.codigo,
			imagemUrl: selectedVariant?.imagemCapaUrl ?? product.imagemCapaUrl,
			quantidade: quantity,
			valorUnitarioBase: basePrice,
			valorModificadores: modifiersTotal,
			valorUnitarioFinal: unitFinal,
			valorTotalBruto: unitFinal * quantity,
			valorDesconto: 0,
			valorTotalLiquido: unitFinal * quantity,
			modificadores: modifiers,
		});
		onClose();
	};

	const headerImage = selectedVariant?.imagemCapaUrl ?? product.imagemCapaUrl;

	return (
		<ResponsiveMenu
			menuTitle={product.nome}
			menuDescription="Configure o produto para adicionar ao carrinho."
			menuActionButtonText="ADICIONAR AO CARRINHO"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleAddToCart}
			closeMenu={onClose}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			menuActionButtonClassName={cn(!canAddToCart && "opacity-50")}
		>
			<div className="flex flex-col gap-6">
				{headerImage ? (
					<div className="relative h-40 w-full overflow-hidden rounded-2xl bg-secondary/40">
						<Image src={headerImage} alt={product.nome} fill className="object-cover" />
					</div>
				) : null}

				{/* Variantes — mesmas linhas compactas dos adicionais */}
				{hasVariants ? (
					<section className="flex flex-col gap-3">
						<GroupHeading title="Escolha a variante" hint="Escolha 1" required satisfied={!!selectedVariantId} count={selectedVariantId ? 1 : 0} max={1} />
						<div className="flex flex-col gap-2">
							{product.variantes.map((variant) => (
								<OptionRow
									key={variant.id}
									name={variant.nome}
									price={variant.precoVenda}
									priceMode="absolute"
									control="radio"
									selected={selectedVariantId === variant.id}
									onToggle={() => setSelectedVariantId(variant.id)}
								/>
							))}
						</div>
					</section>
				) : null}

				{/* Adicionais */}
				{hasAddOns
					? availableReferences.map((reference) => {
							const grupo = reference.grupo;
							const isRequired = grupo.minOpcoes > 0;
							const isSingle = grupo.maxOpcoes === 1;
							const hasMax = grupo.maxOpcoes >= 1;

							const selectedCount = selectedCountForGroup(grupo);
							const isSatisfied = selectedCount >= grupo.minOpcoes;
							const groupFull = hasMax && selectedCount >= grupo.maxOpcoes;

							const hint = isSingle ? "Escolha 1" : hasMax ? `Escolha até ${grupo.maxOpcoes}` : "Quantas quiser";

							return (
								<section key={reference.produtoAddOnId} className="flex flex-col gap-3">
									<GroupHeading
										title={grupo.nome}
										hint={hint}
										required={isRequired}
										satisfied={isSatisfied}
										count={selectedCount}
										max={hasMax ? grupo.maxOpcoes : 0}
									/>
									<div className="flex flex-col gap-2">
										{grupo.opcoes.map((option) => {
											const selected = selectedModifiers.find((m) => m.opcaoId === option.id);
											const maxQty = option.maxQtdePorItem ?? 1;
											const control: OptionControl = isSingle ? "radio" : maxQty > 1 ? "quantity" : "checkbox";

											return (
												<OptionRow
													key={option.id}
													name={option.nome}
													price={option.precoDelta}
													priceMode="delta"
													control={control}
													selected={!!selected}
													groupFull={groupFull}
													quantity={selected?.quantidade ?? 1}
													maxQty={maxQty}
													onToggle={() => toggleModifier(option.id, grupo.maxOpcoes)}
													onIncrement={() => (selected ? updateModifierQuantity(option.id, 1) : toggleModifier(option.id, grupo.maxOpcoes))}
													onDecrement={() => updateModifierQuantity(option.id, -1)}
												/>
											);
										})}
									</div>
								</section>
							);
						})
					: null}

				{/* Rodapé — quantidade, total e aviso de pendências */}
				<div className="flex flex-col gap-3 border-t pt-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-bold">QUANTIDADE</span>
						<Stepper
							value={quantity}
							onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
							onIncrement={() => setQuantity((q) => q + 1)}
							decrementDisabled={quantity <= 1}
						/>
					</div>

					<div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
						<span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Total</span>
						<span className="text-2xl font-black tabular-nums text-foreground">{formatToMoney(finalPrice)}</span>
					</div>

					{blockReason ? <p className="text-center text-xs font-medium text-destructive">{blockReason}</p> : null}
				</div>
			</div>
		</ResponsiveMenu>
	);
}

type TGrupo = TGetPOSProductsOutput["data"]["products"][number]["addOnsReferencias"][number]["grupo"];

type GroupHeadingProps = {
	title: string;
	hint: string;
	required: boolean;
	satisfied: boolean;
	count: number;
	max: number;
};

function GroupHeading({ title, hint, required, satisfied, count, max }: GroupHeadingProps) {
	const showCounter = max >= 1;
	const atMax = count >= max;
	const counterClass = atMax ? "bg-primary text-primary-foreground" : count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";

	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h3 className="truncate text-sm font-bold tracking-tight">
					{title}
					{required ? <span className="ml-1 text-destructive">*</span> : null}
				</h3>
				<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{hint}</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{showCounter ? (
					<span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums transition-colors", counterClass)}>{`${count} / ${max}`}</span>
				) : null}
				{required && !satisfied ? (
					<span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">Obrigatório</span>
				) : null}
			</div>
		</div>
	);
}

type OptionControl = "radio" | "checkbox" | "quantity";

type OptionRowProps = {
	name: string;
	price: number;
	priceMode: "absolute" | "delta";
	control: OptionControl;
	selected: boolean;
	groupFull?: boolean;
	quantity?: number;
	maxQty?: number;
	onToggle: () => void;
	onIncrement?: () => void;
	onDecrement?: () => void;
};

function OptionRow({ name, price, priceMode, control, selected, groupFull = false, quantity = 1, maxQty = 1, onToggle, onIncrement, onDecrement }: OptionRowProps) {
	const quantityActive = control === "quantity" && selected;
	const showPrice = priceMode === "absolute" || price !== 0;
	const priceLabel = priceMode === "absolute" ? formatToMoney(price) : `+ ${formatToMoney(price)}`;
	const addDisabled = control !== "radio" && groupFull && !selected;

	const body = (
		<div className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{name}</span>
			{showPrice ? <span className="text-xs font-bold text-primary">{priceLabel}</span> : null}
		</div>
	);

	const indicator =
		control === "quantity" ? (
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground/30 text-muted-foreground">
				<Plus className="size-3.5" />
			</span>
		) : (
			<SelectionIndicator selected={selected} shape={control === "radio" ? "circle" : "square"} />
		);

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
				selected ? "border-primary bg-primary/5" : "border-border",
				addDisabled && "opacity-50",
			)}
		>
			{quantityActive ? (
				body
			) : (
				<button
					type="button"
					onClick={control === "quantity" ? onIncrement : onToggle}
					aria-pressed={selected}
					disabled={addDisabled}
					className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
				>
					{body}
					{indicator}
				</button>
			)}

			{quantityActive ? (
				<Stepper
					value={quantity}
					onDecrement={onDecrement}
					onIncrement={onIncrement}
					incrementDisabled={quantity >= maxQty || groupFull}
					size="sm"
					className="shrink-0"
				/>
			) : null}
		</div>
	);
}

function SelectionIndicator({ selected, shape }: { selected: boolean; shape: "circle" | "square" }) {
	return (
		<span
			className={cn(
				"flex size-6 shrink-0 items-center justify-center border-2 transition-colors",
				shape === "circle" ? "rounded-full" : "rounded-md",
				selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
			)}
		>
			{selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
		</span>
	);
}

type StepperProps = {
	value: number;
	onIncrement?: () => void;
	onDecrement?: () => void;
	incrementDisabled?: boolean;
	decrementDisabled?: boolean;
	size?: "sm" | "default";
	className?: string;
};

function Stepper({ value, onIncrement, onDecrement, incrementDisabled, decrementDisabled, size = "default", className }: StepperProps) {
	const btn = size === "sm" ? "size-7 rounded-lg" : "size-9 rounded-lg";
	const icon = size === "sm" ? "size-3" : "size-4";
	const valueWidth = size === "sm" ? "w-6 text-sm" : "w-10 text-lg";

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Button size="icon" variant="outline" className={btn} onClick={onDecrement} disabled={decrementDisabled}>
				<Minus className={icon} />
			</Button>
			<span className={cn("text-center font-black tabular-nums", valueWidth)}>{value}</span>
			<Button size="icon" variant="outline" className={btn} onClick={onIncrement} disabled={incrementDisabled}>
				<Plus className={icon} />
			</Button>
		</div>
	);
}
