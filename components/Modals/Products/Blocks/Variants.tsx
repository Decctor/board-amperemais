import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { CodeIcon, DollarSign, GitBranch, ImageIcon, Pencil, Plus, TagIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type ProductVariantsBlockProps = {
	variants: TUseProductState["state"]["productVariants"];
	addVariant: TUseProductState["addProductVariant"];
	updateVariant: TUseProductState["updateProductVariant"];
	updateVariantImageHolder: TUseProductState["updateProductVariantImageHolder"];
	removeVariant: TUseProductState["removeProductVariant"];
};
export default function ProductVariantsBlock({
	variants,
	addVariant,
	updateVariant,
	updateVariantImageHolder,
	removeVariant,
}: ProductVariantsBlockProps) {
	const [newVariantMenuIsOpen, setNewVariantMenuIsOpen] = useState(false);
	const [editVariantIndex, setEditVariantIndex] = useState<number | null>(null);
	const validVariants = variants.filter((variant) => !variant.deletar);
	const editingVariant = isValidNumber(editVariantIndex) ? validVariants[editVariantIndex as number] : null;
	return (
		<ResponsiveMenuSection title="VARIANTES" icon={<GitBranch className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full items-center justify-end gap-2">
				<Button onClick={() => setNewVariantMenuIsOpen((prev) => !prev)} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR VARIANTE
				</Button>
			</div>
			{validVariants.length > 0 ? (
				validVariants.map((variant, index) => (
					<ProductVariantsBlockVariant
						key={variant.id}
						variant={variant}
						handleEditClick={() => setEditVariantIndex(index)}
						handleDeleteClick={() => removeVariant(index)}
					/>
				))
			) : (
				<div className="w-full text-center text-sm font-medium tracking-tight text-muted-foreground">Nenhuma variante adicionada.</div>
			)}
			{newVariantMenuIsOpen ? (
				<NewProductVariantMenu
					closeMenu={() => setNewVariantMenuIsOpen(false)}
					addVariant={(i) => {
						addVariant(i);
						setNewVariantMenuIsOpen(false);
					}}
				/>
			) : null}
			{editingVariant ? (
				<EditProductVariantMenu
					initialVariant={editingVariant}
					closeMenu={() => setEditVariantIndex(null)}
					updateVariant={(i) => {
						updateVariant(editVariantIndex as number, i);
						setEditVariantIndex(null);
					}}
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

type NewProductVariantMenuProps = {
	closeMenu: () => void;
	addVariant: TUseProductState["addProductVariant"];
};
function NewProductVariantMenu({ closeMenu, addVariant }: NewProductVariantMenuProps) {
	const [variantHolder, setVariantHolder] = useState<TUseProductState["state"]["productVariants"][number]>({
		nome: "",
		codigo: "",
		precoCusto: 0,
		precoVenda: 0,
		quantidade: 0,
		ativo: true,
		imagemCapaHolder: {
			file: null,
			previewUrl: null,
		},
		addOns: [],
	});

	function updateVariantHolder(updates: Partial<TUseProductState["state"]["productVariants"][number]>) {
		setVariantHolder((prev) => ({
			...prev,
			...updates,
		}));
	}

	function updateVariantImageHolder(holder: Partial<TUseProductState["state"]["productVariants"][number]["imagemCapaHolder"]>) {
		setVariantHolder((prev) => ({
			...prev,
			imagemCapaHolder: {
				...prev.imagemCapaHolder,
				...holder,
			},
		}));
	}

	function validateAndAddVariant(info: TUseProductState["state"]["productVariants"][number]) {
		if (!info.nome) return toast.error("Nome da variante não informado.");
		if (!info.codigo) return toast.error("Código da variante não informado.");
		if (!info.precoCusto) return toast.error("Preço de custo da variante não informado.");
		if (!info.precoVenda) return toast.error("Preço de venda da variante não informado.");
		return addVariant(info);
	}
	function ProductVariantsBlockVariantImage({
		imageUrl,
		imageHolder,
	}: {
		imageUrl: TUseProductState["state"]["productVariants"][number]["imagemCapaUrl"];
		imageHolder: TUseProductState["state"]["productVariants"][number]["imagemCapaHolder"];
	}) {
		if (imageHolder.previewUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
		}
		if (imageUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageUrl} />;
		}

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
				<ImageIcon className="h-6 w-6" />
				<p className="text-center font-medium text-xs">DEFINIR CAPA</p>
			</div>
		);
	}
	return (
		<ResponsiveMenu
			menuTitle="NOVA VARIANTE"
			menuDescription="Preencha os campos abaixo para adicionar uma nova variante"
			menuActionButtonText="ADICIONAR VARIANTE"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => validateAndAddVariant(variantHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<div className="flex items-center justify-center min-h-[250px] min-w-[250px]">
				<label className="relative aspect-square w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg" htmlFor="product-variant-dropzone-file">
					<ProductVariantsBlockVariantImage imageHolder={variantHolder.imagemCapaHolder} imageUrl={variantHolder.imagemCapaUrl} />
					<input
						accept=".png,.jpeg,.jpg"
						className="absolute h-full w-full cursor-pointer opacity-0"
						id="product-variant-dropzone-file"
						multiple={false}
						onChange={(e) => {
							const file = e.target.files?.[0] ?? null;
							updateVariantImageHolder({
								file,
								previewUrl: file ? URL.createObjectURL(file) : null,
							});
						}}
						tabIndex={-1}
						type="file"
					/>
				</label>
			</div>
			<TextInput
				label="NOME"
				placeholder="Digite o nome da variante"
				value={variantHolder.nome}
				handleChange={(value) => updateVariantHolder({ nome: value })}
			/>
			<TextInput
				label="CÓDIGO"
				placeholder="Digite o código da variante"
				value={variantHolder.codigo}
				handleChange={(value) => updateVariantHolder({ codigo: value })}
			/>
			<NumberInput
				label="PREÇO DE CUSTO"
				placeholder="Digite o preço de custo da variante"
				value={variantHolder.precoCusto}
				handleChange={(value) => updateVariantHolder({ precoCusto: value })}
			/>
			<NumberInput
				label="PREÇO DE VENDA"
				placeholder="Digite o preço de venda da variante"
				value={variantHolder.precoVenda}
				handleChange={(value) => updateVariantHolder({ precoVenda: value })}
			/>
			<NumberInput
				label="QUANTIDADE EM ESTOQUE"
				placeholder="Digite a quantidade em estoque da variante"
				value={variantHolder.quantidade}
				handleChange={(value) => updateVariantHolder({ quantidade: value })}
			/>
		</ResponsiveMenu>
	);
}

type EditProductVariantMenuProps = {
	initialVariant: TUseProductState["state"]["productVariants"][number];
	closeMenu: () => void;
	updateVariant: (info: TUseProductState["state"]["productVariants"][number]) => void;
};
function EditProductVariantMenu({ initialVariant, closeMenu, updateVariant }: EditProductVariantMenuProps) {
	const [variantHolder, setVariantHolder] = useState<TUseProductState["state"]["productVariants"][number]>(initialVariant);

	function updateVariantHolder(updates: Partial<TUseProductState["state"]["productVariants"][number]>) {
		setVariantHolder((prev) => ({
			...prev,
			...updates,
		}));
	}

	function updateVariantImageHolder(holder: Partial<TUseProductState["state"]["productVariants"][number]["imagemCapaHolder"]>) {
		setVariantHolder((prev) => ({
			...prev,
			imagemCapaHolder: {
				...prev.imagemCapaHolder,
				...holder,
			},
		}));
	}

	function validateAndUpdateVariant(info: TUseProductState["state"]["productVariants"][number]) {
		if (!info.nome) return toast.error("Nome da variante não informado.");
		if (!info.codigo) return toast.error("Código da variante não informado.");
		if (!info.precoCusto) return toast.error("Preço de custo da variante não informado.");
		if (!info.precoVenda) return toast.error("Preço de venda da variante não informado.");
		return updateVariant(info);
	}
	function ProductVariantsBlockVariantImage({
		imageUrl,
		imageHolder,
	}: {
		imageUrl: TUseProductState["state"]["productVariants"][number]["imagemCapaUrl"];
		imageHolder: TUseProductState["state"]["productVariants"][number]["imagemCapaHolder"];
	}) {
		if (imageHolder.previewUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
		}
		if (imageUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageUrl} />;
		}

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
				<ImageIcon className="h-6 w-6" />
				<p className="text-center font-medium text-xs">DEFINIR CAPA</p>
			</div>
		);
	}
	return (
		<ResponsiveMenu
			menuTitle="EDITAR VARIANTE"
			menuDescription="Preencha os campos abaixo para editar a variante"
			menuActionButtonText="ATUALIZAR VARIANTE"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => validateAndUpdateVariant(variantHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<div className="flex items-center justify-center min-h-[250px] min-w-[250px]">
				<label className="relative aspect-square w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg" htmlFor="product-variant-dropzone-file">
					<ProductVariantsBlockVariantImage imageHolder={variantHolder.imagemCapaHolder} imageUrl={variantHolder.imagemCapaUrl} />
					<input
						accept=".png,.jpeg,.jpg"
						className="absolute h-full w-full cursor-pointer opacity-0"
						id="product-variant-dropzone-file"
						multiple={false}
						onChange={(e) => {
							const file = e.target.files?.[0] ?? null;
							updateVariantImageHolder({
								file,
								previewUrl: file ? URL.createObjectURL(file) : null,
							});
						}}
						tabIndex={-1}
						type="file"
					/>
				</label>
			</div>
			<TextInput
				label="NOME"
				placeholder="Digite o nome da variante"
				value={variantHolder.nome}
				handleChange={(value) => updateVariantHolder({ nome: value })}
			/>
			<TextInput
				label="CÓDIGO"
				placeholder="Digite o código da variante"
				value={variantHolder.codigo}
				handleChange={(value) => updateVariantHolder({ codigo: value })}
			/>
			<NumberInput
				label="PREÇO DE CUSTO"
				placeholder="Digite o preço de custo da variante"
				value={variantHolder.precoCusto}
				handleChange={(value) => updateVariantHolder({ precoCusto: value })}
			/>
			<NumberInput
				label="PREÇO DE VENDA"
				placeholder="Digite o preço de venda da variante"
				value={variantHolder.precoVenda}
				handleChange={(value) => updateVariantHolder({ precoVenda: value })}
			/>
			<NumberInput
				label="QUANTIDADE EM ESTOQUE"
				placeholder="Digite a quantidade em estoque da variante"
				value={variantHolder.quantidade}
				handleChange={(value) => updateVariantHolder({ quantidade: value })}
			/>
		</ResponsiveMenu>
	);
}

type ProductVariantsBlockVariantProps = {
	variant: TUseProductState["state"]["productVariants"][number];
	handleEditClick: () => void;
	handleDeleteClick: () => void;
};
function ProductVariantsBlockVariant({ variant, handleEditClick, handleDeleteClick }: ProductVariantsBlockVariantProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-1.5 py-2 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="relative h-10 max-h-10 min-h-10 w-10 max-w-10 min-w-10 overflow-hidden rounded-lg">
					{variant.imagemCapaUrl ? (
						<Image src={variant.imagemCapaUrl} alt="Imagem de capa da variante" fill={true} objectFit="cover" />
					) : variant.imagemCapaHolder.previewUrl ? (
						<Image src={variant.imagemCapaHolder.previewUrl} alt="Imagem de capa da variante" fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
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
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{variant.codigo}</h1>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">CUSTO: {formatToMoney(variant.precoCusto)}</h1>
						</div>
						<div className="flex items-center gap-1">
							<TagIcon className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">VENDA: {formatToMoney(variant.precoVenda)}</h1>
						</div>
					</div>
				</div>
				<div className="w-full flex items-center justify-end">
					<Button onClick={handleEditClick} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
						<Pencil className="w-4 h-4 min-w-4 min-h-4" />
						EDITAR
					</Button>
					<Button
						onClick={handleDeleteClick}
						size="fit"
						variant="ghost"
						className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive duration-300 ease-in-out"
					>
						<Trash2 className="w-4 h-4 min-w-4 min-h-4" />
						EDITAR
					</Button>
				</div>
			</div>
		</div>
	);
}
