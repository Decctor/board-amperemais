import { TGetProductsOutputById } from "@/app/api/products/route";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { formatToMoney } from "@/lib/formatting";
import { Package, Pencil, GitBranch, DollarSign, CodeIcon, TagIcon, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { createProductVariant, updateProductVariant } from "@/lib/mutations/products";
import { TUseProductVariantState } from "@/state-hooks/use-product-state";
import VariantMenu from "@/components/Modals/Products/Variants/VariantMenu";
import { uploadFile } from "@/lib/files-storage";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

type ProductVariantsInformationProps = {
	product: TGetProductsOutputById;
	sectionWrapperClassName?: string;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};
export default function ProductVariantsInformation({ product, sectionWrapperClassName, callbacks }: ProductVariantsInformationProps) {
	const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
	const [newVariantMenuIsOpen, setNewVariantMenuIsOpen] = useState(false);

	async function handleCreationVariantSubmiting(state: TUseProductVariantState["state"]) {
		let coverImageUrl = state.imagemCapaUrl;

		if (state.imagemCapaHolder.file) {
			const { url } = await uploadFile({
				file: state.imagemCapaHolder.file,
				fileName: state.nome,
				prefix: "syncrono",
			});
			coverImageUrl = url;
		}

		return await createProductVariant({
			productVariant: {
				...state,
				produtoId: product.id,
				imagemCapaUrl: coverImageUrl,
			},
			perfisFiscais: state.perfisFiscais.map((profile) => ({
				...profile,
				deletar: false,
			})),
			addOns: state.addOns.map((addOn) => ({
				...addOn,
				deletar: false,
			})),
		});
	}
	async function handleEditVariantSubmiting({ state, productVariantId }: { state: TUseProductVariantState["state"]; productVariantId: string }) {
		let coverImageUrl = state.imagemCapaUrl;

		if (state.imagemCapaHolder.file) {
			const { url } = await uploadFile({
				file: state.imagemCapaHolder.file,
				fileName: state.nome,
				prefix: "syncrono",
			});
			coverImageUrl = url;
		}
		return await updateProductVariant({
			productVariantId,
			productVariant: {
				...state,
				produtoId: product.id,
				imagemCapaUrl: coverImageUrl,
			},
			perfisFiscais: state.perfisFiscais.map((profile) => ({
				...profile,
				deletar: false,
			})),
			addOns: state.addOns.map((addOn) => ({
				...addOn,
				deletar: false,
			})),
		});
	}

	const { mutate: createVariantMutation, isPending: isCreatingVariant } = useMutation({
		mutationKey: ["create-product-variant", product.id],
		mutationFn: handleCreationVariantSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setNewVariantMenuIsOpen(false);
			toast.success("Variante criada com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});
	const { mutate: updateVariantMutation, isPending: isUpdatingVariant } = useMutation({
		mutationKey: ["update-product-variant", product.id],
		mutationFn: handleEditVariantSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setEditingVariantId(null);
			toast.success("Variante atualizada com sucesso");
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
			icon={<GitBranch className="w-4 h-4 min-w-4 min-h-4" />}
			title="VARIANTES"
			wrapperClassName={sectionWrapperClassName}
			actions={
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="xs" onClick={() => setNewVariantMenuIsOpen(true)} className="flex items-center gap-1">
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						ADICIONAR
					</Button>
				</div>
			}
		>
			<div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto">
				{product.variantes.length > 0 ? (
					product.variantes.map((variant) => (
						<ProductVariantCard key={variant.id} variant={variant} handleEditClick={() => setEditingVariantId(variant.id)} />
					))
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Package className="w-4 h-4" />
							</EmptyMedia>
							<EmptyTitle>Nenhuma variante encontrada</EmptyTitle>
							<EmptyDescription>Adicione uma variante para começar</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
			{editingVariantId ? (
				<VariantMenu
					variantId={editingVariantId}
					closeMenu={() => setEditingVariantId(null)}
					submitVariant={(state) => updateVariantMutation({ state, productVariantId: editingVariantId })}
					submitVariantIsLoading={isUpdatingVariant}
				/>
			) : null}
			{newVariantMenuIsOpen ? (
				<VariantMenu
					variantId={undefined}
					closeMenu={() => setNewVariantMenuIsOpen(false)}
					submitVariant={(state) => createVariantMutation(state)}
					submitVariantIsLoading={isCreatingVariant}
				/>
			) : null}
		</SectionWrapper>
	);
}

type ProductVariantCardProps = {
	variant: TGetProductsOutputById["variantes"][number];
	handleEditClick: () => void;
};
function ProductVariantCard({ variant, handleEditClick }: ProductVariantCardProps) {
	return (
		<div className={cn("bg-card border-border flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-1.5 py-2 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="relative h-10 max-h-10 min-h-10 w-10 max-w-10 min-w-10 overflow-hidden rounded-lg">
					{variant.imagemCapaUrl ? (
						<Image src={variant.imagemCapaUrl} alt="Imagem de capa da variante" fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-foreground-foreground flex h-full w-full items-center justify-center">
							<GitBranch className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className=" flex flex-col grow gap-1">
				<div className="w-full flex items-center flex-col md:flex-row justify-between gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{variant.nome}</h1>
						<div className="flex items-center gap-1">
							<CodeIcon className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">{variant.codigo}</h1>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{variant.precoCusto ? (
							<div className="flex items-center gap-1">
								<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">CUSTO: {formatToMoney(variant.precoCusto)}</h1>
							</div>
						) : null}
						{variant.precoVenda ? (
							<div className="flex items-center gap-1">
								<TagIcon className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">VENDA: {formatToMoney(variant.precoVenda)}</h1>
							</div>
						) : null}
					</div>
				</div>
				<div className="w-full flex items-center justify-end">
					<Button onClick={handleEditClick} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
						<Pencil className="w-4 h-4 min-w-4 min-h-4" />
						EDITAR
					</Button>
				</div>
			</div>
		</div>
	);
}
