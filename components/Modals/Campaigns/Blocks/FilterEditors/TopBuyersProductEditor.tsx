"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useProductById, useProductsBySearchInfiniteQuery } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import {
	CampaignProductClientReferenceWindowEnum,
	CampaignTopBuyersProductFilterConfigSchema,
	type TCampaignProductClientReferenceWindowEnum,
	type TCampaignTopBuyersProductFilterConfig,
} from "@/schemas/campaigns";
import { Check, ChevronsUpDown, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const WINDOW_OPTIONS: { value: TCampaignProductClientReferenceWindowEnum; label: string }[] = [
	{ value: "GERAL", label: "TODO HISTÓRICO" },
	{ value: "30_DIAS", label: "ÚLTIMOS 30 DIAS" },
	{ value: "90_DIAS", label: "ÚLTIMOS 90 DIAS" },
];

type TopBuyersProductEditorProps = {
	initialValue?: TCampaignTopBuyersProductFilterConfig;
	onConfirm: (config: TCampaignTopBuyersProductFilterConfig) => void;
	closeModal: () => void;
};

export default function TopBuyersProductEditor({ initialValue, onConfirm, closeModal }: TopBuyersProductEditorProps) {
	const [produtoId, setProdutoId] = useState<string>(initialValue?.produtoId ?? "");
	const [janela, setJanela] = useState<TCampaignProductClientReferenceWindowEnum>(initialValue?.janela ?? "GERAL");
	const [top, setTop] = useState<number>(initialValue?.top ?? 100);

	function handleConfirm() {
		const candidate = {
			produtoId: produtoId.trim(),
			janela,
			top,
		};
		const parsed = CampaignTopBuyersProductFilterConfigSchema.safeParse(candidate);
		if (!parsed.success) {
			const firstIssue = parsed.error.issues[0];
			toast.error(firstIssue?.message ?? "Preencha os campos do filtro de top compradores.");
			return;
		}
		if (!CampaignProductClientReferenceWindowEnum.safeParse(parsed.data.janela).success) {
			toast.error("Janela do filtro não informada.");
			return;
		}
		onConfirm(parsed.data);
		closeModal();
	}

	return (
		<ResponsiveMenu
			menuTitle="TOP COMPRADORES DE PRODUTO"
			menuDescription="Selecione um produto, o período de referência e quantos dos maiores compradores incluir."
			menuActionButtonText="CONFIRMAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleConfirm}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
		>
			<ResponsiveMenuSection title="TOP COMPRADORES" icon={<Crown className="h-4 min-h-4 w-4 min-w-4" />}>
				<ProductPicker value={produtoId} onChange={setProdutoId} />

				<div className="flex w-full flex-col gap-2">
					<Label className="text-sm font-medium tracking-tight text-foreground/80">JANELA</Label>
					<div className="flex flex-wrap items-center gap-2">
						{WINDOW_OPTIONS.map((option) => (
							<Button
								key={option.value}
								type="button"
								variant={janela === option.value ? "brand" : "outline"}
								size="sm"
								className="flex items-center gap-1.5"
								onClick={() => setJanela(option.value)}
							>
								{option.label}
							</Button>
						))}
					</div>
				</div>
				<div className="flex w-full flex-col gap-2">
					<Label className="text-sm font-medium tracking-tight text-foreground/80">TOP</Label>
					<div className="w-full flex items-center flex-wrap gap-x-3 gap-y-1">
						<Button variant={top === 10 ? "brand" : "outline"} size="sm" className="flex items-center gap-1.5" onClick={() => setTop(10)}>
							<Crown className="w-4 h-4 min-w-4 min-h-4" />
							TOP 10
						</Button>
						<Button variant={top === 50 ? "brand" : "outline"} size="sm" className="flex items-center gap-1.5" onClick={() => setTop(50)}>
							<Crown className="w-4 h-4 min-w-4 min-h-4" />
							TOP 50
						</Button>
						<Button variant={top === 100 ? "brand" : "outline"} size="sm" className="flex items-center gap-1.5" onClick={() => setTop(100)}>
							<Crown className="w-4 h-4 min-w-4 min-h-4" />
							TOP 100
						</Button>
					</div>
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}

type ProductPickerProps = {
	value: string;
	onChange: (id: string) => void;
};
function ProductPicker({ value, onChange }: ProductPickerProps) {
	const [open, setOpen] = useState(false);
	const { products, search, updateSearch, isLoading, hasMorePages, loadMore, isFetchingNextPage } = useProductsBySearchInfiniteQuery();
	const { data: selectedProduct, isLoading: isLoadingSelected } = useProductById({ id: value });

	const selectedLabel = value
		? isLoadingSelected
			? "Carregando produto..."
			: selectedProduct
				? `${selectedProduct.product.nome}${selectedProduct.product.codigo ? ` (${selectedProduct.product.codigo})` : ""}`
				: "Produto não encontrado"
		: "Selecione um produto";

	return (
		<div className="flex w-full flex-col gap-1">
			<Label className="text-sm font-medium tracking-tight text-foreground/80">
				PRODUTO<span className="text-red-500">*</span>
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						aria-haspopup="listbox"
						aria-expanded={open}
						className="w-full justify-between truncate border border-border"
					>
						<span className="truncate text-left">{selectedLabel}</span>
						<ChevronsUpDown className="h-3 w-3 min-h-3 min-w-3" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
					<Command shouldFilter={false} loop>
						<CommandInput placeholder="Buscar produto..." value={search} onValueChange={updateSearch} />
						<CommandList>
							{isLoading && products.length === 0 ? (
								<div className="flex items-center justify-center p-4">
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								</div>
							) : products.length === 0 ? (
								<CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
							) : (
								products.map((product) => (
									<CommandItem
										key={product.id}
										value={product.id}
										keywords={[product.nome, product.codigo ?? ""]}
										onSelect={() => {
											onChange(product.id);
											setOpen(false);
										}}
									>
										<div className="flex min-w-0 flex-col">
											<span className="truncate text-sm">{product.nome}</span>
											{product.codigo ? <span className="truncate text-xs text-muted-foreground">Código: {product.codigo}</span> : null}
										</div>
										<Check className={cn("ml-auto", product.id === value ? "opacity-100" : "opacity-0")} />
									</CommandItem>
								))
							)}
							{hasMorePages ? (
								<div className="flex items-center justify-center p-2">
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={(e) => {
											e.preventDefault();
											loadMore();
										}}
										disabled={isFetchingNextPage}
									>
										{isFetchingNextPage ? (
											<>
												<Loader2 className="h-3 w-3 animate-spin" /> Carregando...
											</>
										) : (
											"CARREGAR MAIS"
										)}
									</Button>
								</div>
							) : null}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
