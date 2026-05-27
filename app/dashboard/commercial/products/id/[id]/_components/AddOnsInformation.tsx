import { TGetProductsOutputById } from "@/app/api/products/route";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { Package, Pencil, Layers, Plus, LinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { createProductAddOn, updateProductAddOn } from "@/lib/mutations/products";
import { TUseProductAddOnState } from "@/state-hooks/use-product-state";
import AddOnMenu from "@/components/Modals/Products/AddOns/AddOnMenu";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type ProductAddOnsInformationProps = {
	product: TGetProductsOutputById;
	sectionWrapperClassName?: string;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};
export default function ProductAddOnsInformation({ product, sectionWrapperClassName, callbacks }: ProductAddOnsInformationProps) {
	const [newAddOnMenuIsOpen, setNewAddOnMenuIsOpen] = useState(false);
	const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);

	async function handleCreationAddOnSubmiting(state: TUseProductAddOnState["state"]) {
		return await createProductAddOn({
			productId: product.id,
			addOn: {
				...state,
				opcoes: state.opcoes.map((option) => ({
					...option,
					deletar: false,
				})),
			},
		});
	}

	async function handleEditAddOnSubmiting({ state, productAddOnId }: { state: TUseProductAddOnState["state"]; productAddOnId: string }) {
		return await updateProductAddOn({
			productId: product.id,
			productAddOnId,
			addOn: state,
		});
	}

	const { mutate: createAddOnMutation, isPending: isCreatingAddOn } = useMutation({
		mutationKey: ["create-product-add-on", product.id],
		mutationFn: handleCreationAddOnSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setNewAddOnMenuIsOpen(false);
			toast.success("Adicional criado com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});
	const { mutate: updateAddOnMutation, isPending: isUpdatingAddOn } = useMutation({
		mutationKey: ["update-product-add-on", product.id],
		mutationFn: handleEditAddOnSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setEditingAddOnId(null);
			toast.success("Adicional atualizado com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});

	return (
		<SectionWrapper
			icon={<Layers className="w-4 h-4 min-w-4 min-h-4" />}
			title="ADICIONAIS"
			wrapperClassName={sectionWrapperClassName}
			actions={
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="xs" onClick={() => setNewAddOnMenuIsOpen(true)} className="flex items-center gap-1">
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						ADICIONAR
					</Button>
				</div>
			}
		>
			<div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto">
				{product.addOnsReferencias.length > 0 ? (
					product.addOnsReferencias.map((addOn) => (
						<ProductAddOnGroupCard key={addOn.grupo.id} addOn={addOn} handleEditClick={() => setEditingAddOnId(addOn.grupo.id)} />
					))
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Layers className="w-4 h-4" />
							</EmptyMedia>
							<EmptyTitle>Nenhum grupo de adicionais encontrado</EmptyTitle>
							<EmptyDescription>Adicione um grupo de adicionais para começar</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
			{editingAddOnId ? (
				<AddOnMenu
					addOnId={editingAddOnId}
					closeMenu={() => setEditingAddOnId(null)}
					submitAddOn={(state) => updateAddOnMutation({ state, productAddOnId: editingAddOnId })}
					submitAddOnIsLoading={isUpdatingAddOn}
				/>
			) : null}
			{newAddOnMenuIsOpen ? (
				<AddOnMenu
					addOnId={undefined}
					closeMenu={() => setNewAddOnMenuIsOpen(false)}
					submitAddOn={(state) => createAddOnMutation(state)}
					submitAddOnIsLoading={isCreatingAddOn}
				/>
			) : null}
		</SectionWrapper>
	);
}

type ProductAddOnGroupCardProps = {
	addOn: TGetProductsOutputById["addOnsReferencias"][number];
	handleEditClick: () => void;
};

function ProductAddOnGroupCard({ addOn, handleEditClick }: ProductAddOnGroupCardProps) {
	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-2 rounded-xl border p-3 shadow-2xs")}>
			{/* HEADER DO GRUPO */}
			<div className="flex w-full items-start justify-between gap-4 border-b border-border pb-2">
				<div className="flex flex-col gap-0.5">
					<h1 className="text-sm font-bold tracking-tight">{addOn.grupo.nome}</h1>
					<p className="text-xs text-muted-foreground italic">{addOn.grupo.internoNome}</p>
					<div className="flex items-center gap-2 mt-1">
						<span className="text-[0.65rem] font-medium bg-primary/10 text-foreground px-1.5 py-0.5 rounded-md">MÍN: {addOn.grupo.minOpcoes}</span>
						<span className="text-[0.65rem] font-medium bg-primary/10 text-foreground px-1.5 py-0.5 rounded-md">MÁX: {addOn.grupo.maxOpcoes}</span>
						<span
							className={cn(
								"text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md",
								addOn.grupo.ativo ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
							)}
						>
							{addOn.grupo.ativo ? "ATIVO" : "INATIVO"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button onClick={handleEditClick} size="icon" variant="ghost" className="h-7 w-7">
						<Pencil className="w-4 h-4 text-muted-foreground" />
					</Button>
				</div>
			</div>

			{/* LISTA DE OPÇÕES */}
			<div className="flex flex-col w-full gap-2 mt-1">
				{addOn.grupo.opcoes.map((option) => (
					<ProductAddOnOptionCard key={option.id || `temp-opt-${option.id}`} option={option} />
				))}
			</div>
		</div>
	);
}

type ProductAddOnOptionCardProps = {
	option: TGetProductsOutputById["addOnsReferencias"][number]["grupo"]["opcoes"][number];
};

function ProductAddOnOptionCard({ option }: ProductAddOnOptionCardProps) {
	return (
		<div className="w-full grid grid-cols-12 gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border/50">
			{option.produto ? (
				<div className="col-span-12 flex items-center justify-between gap-2 p-1.5 bg-primary/10 rounded-md border border-border mb-1">
					<div className="flex items-center gap-2">
						<LinkIcon className="w-3.5 h-3.5 text-foreground" />
						<div className="flex flex-col">
							<span className="text-[0.65rem] font-bold text-foreground/80 uppercase tracking-tight">CONSUMO DE ESTOQUE VINCULADO A:</span>
							<p className="text-xs font-medium text-foreground line-clamp-1">{option.produto.descricao}</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<Package className="w-4 h-4 min-w-4 min-h-4" />
						<span className="text-[0.65rem] font-medium text-foreground/80">
							{option.produto.quantidade != null ? formatDecimalPlaces(option.produto.quantidade, 2) : "NÃO INFORMADO"}
						</span>
					</div>
				</div>
			) : null}

			<div className="col-span-12 sm:col-span-6 lg:col-span-5">
				<span className="text-[0.65rem] font-medium text-foreground/80">{option.nome}</span>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<span className="text-[0.65rem] font-medium text-foreground/80">{option.codigo}</span>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<span className="text-[0.65rem] font-medium text-foreground/80">{formatToMoney(option.precoDelta)}</span>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<span className="text-[0.65rem] font-medium text-foreground/80">{option.maxQtdePorItem}</span>
			</div>
		</div>
	);
}
