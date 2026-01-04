import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ProductVinculation from "@/components/Modals/Products/ProductVinculation";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale, formatDateForInputValue, formatDateOnInputChange, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { Code, Pencil, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SalesPromoCampaignItemsBlockProps = {
	items: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"];
	addItem: (item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) => void;
	updateItem: (index: number, changes: Partial<TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]>) => void;
	deleteItem: (index: number) => void;
};
export default function SalesPromoCampaignItemsBlock({ items, addItem, updateItem, deleteItem }: SalesPromoCampaignItemsBlockProps) {
	const [newCompositionItemMenuIsOpen, setNewCompositionItemMenuIsOpen] = useState(false);
	const [editCompositionItemIndex, setEditCompositionItemIndex] = useState<number | null>(null);

	const editingItem = isValidNumber(editCompositionItemIndex) ? items[editCompositionItemIndex as number] : null;
	return (
		<ResponsiveMenuSection title="ITENS" icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-end">
				<div className="w-full flex items-center justify-end">
					<Button
						onClick={() => setNewCompositionItemMenuIsOpen((prev) => !prev)}
						size="fit"
						variant="ghost"
						className="flex items-center gap-1 px-2 py-1 text-xs"
					>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						NOVO ITEM
					</Button>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				{items.length > 0 ? (
					items.map((item, index) => (
						<ItemCard
							key={item.titulo}
							item={item}
							handleRemoveClick={() => deleteItem(index)}
							handleEditClick={() => setEditCompositionItemIndex(index)}
						/>
					))
				) : (
					<p className="w-full text-center text-sm italic text-primary">Nenhum item adicionado.</p>
				)}
			</div>
			{newCompositionItemMenuIsOpen && <NewItemMenu addItem={addItem} closeMenu={() => setNewCompositionItemMenuIsOpen(false)} />}
			{editingItem ? (
				<EditItemMenu
					initialItem={editingItem}
					updateItem={(changes) => updateItem(editCompositionItemIndex!, changes)}
					closeMenu={() => setEditCompositionItemIndex(null)}
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

type ItemCardProps = {
	item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];
	handleRemoveClick: () => void;
	handleEditClick: () => void;
};
function ItemCard({ item, handleRemoveClick, handleEditClick }: ItemCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-2 shadow-2xs")}>
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{item.titulo}</h1>
				</div>
			</div>
			<div className="flex items-center gap-2 self-center">
				<p className="line-through text-xs text-primary/80">DE {formatToMoney(item.valorBase)}</p>
				<p className="text-xs font-medium">{formatToMoney(item.valorPromocional)}</p>
			</div>
			{item.anuncioData && item.anuncioValorPromocional ? (
				<p className="w-fit self-center text-xs px-2 py-1 bg-green-100 text-green-600 rounded-lg text-center">
					Condição especial de {formatToMoney(item.anuncioValorPromocional)} na data {formatDateAsLocale(item.anuncioData)}
				</p>
			) : null}
			<div className="w-full flex items-center justify-between">
				<div className="flex items-center gap-2">
					<p className="text-xs text-primary/80">ETIQUETA: {item.etiqueta}</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" className="flex items-center gap-1.5 p-2 rounded-full hover:bg-destructive/10" size="fit" onClick={handleRemoveClick}>
						<Trash2 className="w-3 min-w-3 h-3 min-h-3" />
					</Button>
					<Button variant="ghost" className="flex items-center gap-1.5 p-2 rounded-full hover:bg-primary/10" size="fit" onClick={handleEditClick}>
						<Pencil className="w-3 min-w-3 h-3 min-h-3" />
					</Button>
				</div>
			</div>
		</div>
	);
}

type NewItemMenuProps = {
	addItem: (item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) => void;
	closeMenu: () => void;
};
function NewItemMenu({ addItem, closeMenu }: NewItemMenuProps) {
	const [newProductMenuIsOpen, setNewProductMenuIsOpen] = useState(false);
	const [itemHolder, setItemHolder] = useState<TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]>({
		titulo: "",
		produtos: [],
		valorBase: 0,
		valorPromocional: 0,
		etiqueta: "PROMO-A4",
	});
	function validateAndAddItem(info: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) {
		if (info.produtos.length === 0) return toast.error("Selecione ao menos um produto.");
		if (!info.valorBase) return toast.error("Valor base não informado.");
		if (!info.valorPromocional) return toast.error("Valor promocional não informado.");
		if (!info.etiqueta) return toast.error("Etiqueta não informada.");
		addItem(info);
		return closeMenu();
	}
	function validateAndAddProduct(product: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]["produtos"][number]) {
		if (!product.id) return toast.error("ID do produto não informado.");

		const isProductAlreadyDefined = itemHolder.produtos.some((item) => item.id === product.id);
		if (isProductAlreadyDefined) return toast.error("Produto já adicionado.");
		const newProductsList = [...itemHolder.produtos, product];
		const newTitle = newProductsList.map((p) => p.nome).join(" + ");
		setItemHolder((prev) => ({ ...prev, produtos: newProductsList, titulo: newTitle }));
		setNewProductMenuIsOpen(false);
	}
	function removeProductFromList(index: number) {
		const newProductsList = [...itemHolder.produtos].filter((_, i) => i !== index);
		const newTitle = newProductsList.map((p) => p.nome).join(" + ");
		setItemHolder((prev) => ({ ...prev, produtos: newProductsList, titulo: newTitle }));
	}
	console.log(itemHolder);
	return (
		<ResponsiveMenu
			menuTitle="NOVO ITEM"
			menuDescription="Preencha os campos abaixo para criar um novo item"
			menuActionButtonText="ADICIONAR ITEM"
			menuCancelButtonText="FECHAR"
			actionFunction={() => validateAndAddItem(itemHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
		>
			{itemHolder.produtos.map((product, index) => (
				<div key={product.id} className="w-full flex flex-col items-center gap-1 self-center px-2 py-1 rounded-lg bg-primary/10">
					<div className="w-full flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-sm font-medium">ITEM {index + 1}</p>
						</div>
						<Button variant={"ghost"} size="fit" className="px-2 py-1" onClick={() => removeProductFromList(index)}>
							<Trash2 className="w-4 h-4 min-w-4 min-h-4" />
						</Button>
					</div>
					<p className="text-sm font-medium text-center">{product.nome}</p>
				</div>
			))}

			<div className="w-full flex items-center justify-end">
				<Button
					onClick={() => setNewProductMenuIsOpen(true)}
					size={"fit"}
					variant={"ghost"}
					className="flex items-center gap-1 px-2 py-1 text-xs self-center"
				>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR PRODUTO
				</Button>
			</div>

			<TextInput
				label="TÍTULO"
				placeholder="Título do item promocional..."
				value={itemHolder.titulo}
				handleChange={(value) => setItemHolder({ ...itemHolder, titulo: value })}
			/>
			<NumberInput
				label="VALOR BASE"
				value={itemHolder.valorBase}
				placeholder="Digite o valor base do item"
				handleChange={(value) => setItemHolder({ ...itemHolder, valorBase: value })}
			/>
			<NumberInput
				label="VALOR PROMOCIONAL"
				value={itemHolder.valorPromocional}
				placeholder="Digite o valor promocional do item"
				handleChange={(value) => setItemHolder({ ...itemHolder, valorPromocional: value })}
			/>
			<SelectInput
				label="ETIQUETA"
				value={itemHolder.etiqueta}
				selectedItemLabel="Selecione a etiqueta do item"
				options={[
					{
						id: "PROMO-A4",
						label: "PROMO-A4",
						value: "PROMO-A4",
					},
					{
						id: "PROMO-GRID-1/16",
						label: "PROMO-GRID-1/16",
						value: "PROMO-GRID-1/16",
					},
				]}
				handleChange={(value) => setItemHolder((prev) => ({ ...prev, etiqueta: value }))}
				onReset={() => setItemHolder((prev) => ({ ...prev, etiqueta: "PROMO-A4" }))}
			/>
			<div className="w-full flex flex-col gap-1">
				<p className="w-full text-sm font-medium">CONDIÇÕES ESPECIAIS</p>
				<DateInput
					label="DATA DA CONDIÇÃO ESPECIAL"
					value={formatDateForInputValue(itemHolder.anuncioData)}
					handleChange={(value) => setItemHolder({ ...itemHolder, anuncioData: formatDateOnInputChange(value, "string") ?? undefined })}
					width="100%"
				/>
				<NumberInput
					label="VALOR PROMOCIONAL DE ANÚNCIO"
					value={itemHolder.anuncioValorPromocional ?? null}
					placeholder="Digite o valor promocional da condição especial..."
					handleChange={(value) => setItemHolder({ ...itemHolder, anuncioValorPromocional: value })}
					width="100%"
				/>
			</div>
			{newProductMenuIsOpen && (
				<ProductVinculation
					handleSelection={(product) => {
						validateAndAddProduct({
							id: product.id,
							codigo: product.codigo,
							nome: product.descricao,
						});
					}}
					closeModal={() => setNewProductMenuIsOpen(false)}
				/>
			)}
		</ResponsiveMenu>
	);
}

type EditItemMenuProps = {
	initialItem: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];
	updateItem: (item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) => void;
	closeMenu: () => void;
};
function EditItemMenu({ initialItem, updateItem, closeMenu }: EditItemMenuProps) {
	const [newProductMenuIsOpen, setNewProductMenuIsOpen] = useState(false);
	const [itemHolder, setItemHolder] = useState<TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]>(initialItem);
	function validateAndUpdateItem(info: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) {
		if (!info.produtos.length) return toast.error("Selecione ao menos um produto.");
		if (!info.valorBase) return toast.error("Valor base não informado.");
		if (!info.valorPromocional) return toast.error("Valor promocional não informado.");
		if (!info.etiqueta) return toast.error("Etiqueta não informada.");
		updateItem(info);
		return closeMenu();
	}
	function validateAndAddProduct(product: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]["produtos"][number]) {
		if (!product.id) return toast.error("ID do produto não informado.");
		const isProductAlreadyDefined = itemHolder.produtos.some((item) => item.id === product.id);
		if (isProductAlreadyDefined) return toast.error("Produto já adicionado.");
		const newProductsList = [...itemHolder.produtos, product];
		const newTitle = newProductsList.map((p) => p.nome).join(" + ");
		setItemHolder((prev) => ({ ...prev, produtos: newProductsList, titulo: newTitle }));
		setNewProductMenuIsOpen(false);
	}
	function removeProductFromList(index: number) {
		const newProductsList = [...itemHolder.produtos].filter((_, i) => i !== index);
		const newTitle = newProductsList.map((p) => p.nome).join(" + ");
		setItemHolder((prev) => ({ ...prev, produtos: newProductsList, titulo: newTitle }));
	}
	return (
		<ResponsiveMenu
			menuTitle="EDITAR ITEM"
			menuDescription="Preencha os campos abaixo para editar o item"
			menuActionButtonText="ATUALIZAR ITEM"
			menuCancelButtonText="FECHAR"
			actionFunction={() => validateAndUpdateItem(itemHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
		>
			{itemHolder.produtos.map((product, index) => (
				<div key={product.id} className="w-full flex flex-col items-center gap-1 self-center px-2 py-1 rounded-lg bg-primary/10">
					<div className="w-full flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-sm font-medium">ITEM {index + 1}</p>
						</div>
						<Button variant={"ghost"} size="fit" className="px-2 py-1" onClick={() => removeProductFromList(index)}>
							<Trash2 className="w-4 h-4 min-w-4 min-h-4" />
						</Button>
					</div>
					<p className="text-sm font-medium text-center">{product.nome}</p>
				</div>
			))}

			<div className="w-full flex items-center justify-end">
				<Button
					onClick={() => setNewProductMenuIsOpen(true)}
					size={"fit"}
					variant={"ghost"}
					className="flex items-center gap-1 px-2 py-1 text-xs self-center"
				>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR PRODUTO
				</Button>
			</div>

			<TextInput
				label="TÍTULO"
				placeholder="Digite o título do item..."
				value={itemHolder.titulo}
				handleChange={(value) => setItemHolder({ ...itemHolder, titulo: value })}
			/>
			<NumberInput
				label="VALOR BASE"
				value={itemHolder.valorBase}
				placeholder="Digite o valor base do item"
				handleChange={(value) => setItemHolder({ ...itemHolder, valorBase: value })}
			/>
			<NumberInput
				label="VALOR PROMOCIONAL"
				value={itemHolder.valorPromocional}
				placeholder="Digite o valor promocional do item"
				handleChange={(value) => setItemHolder({ ...itemHolder, valorPromocional: value })}
			/>
			<SelectInput
				label="ETIQUETA"
				value={itemHolder.etiqueta}
				selectedItemLabel="Selecione a etiqueta do item"
				options={[
					{
						id: "PROMO-A4",
						label: "PROMO-A4",
						value: "PROMO-A4",
					},
					{
						id: "PROMO-GRID-1/16",
						label: "PROMO-GRID-1/16",
						value: "PROMO-GRID-1/16",
					},
				]}
				handleChange={(value) => setItemHolder((prev) => ({ ...prev, etiqueta: value }))}
				onReset={() => setItemHolder((prev) => ({ ...prev, etiqueta: "PROMO-A4" }))}
			/>
			<div className="w-full flex flex-col gap-1">
				<p className="w-full text-sm font-medium">CONDIÇÕES ESPECIAIS</p>
				<DateInput
					label="DATA DA CONDIÇÃO ESPECIAL"
					value={formatDateForInputValue(itemHolder.anuncioData)}
					handleChange={(value) => setItemHolder({ ...itemHolder, anuncioData: formatDateOnInputChange(value, "string") ?? undefined })}
					width="100%"
				/>
				<NumberInput
					label="VALOR PROMOCIONAL DE ANÚNCIO"
					value={itemHolder.anuncioValorPromocional ?? null}
					placeholder="Digite o valor promocional da condição especial..."
					handleChange={(value) => setItemHolder({ ...itemHolder, anuncioValorPromocional: value })}
					width="100%"
				/>
			</div>
			{newProductMenuIsOpen && (
				<ProductVinculation
					handleSelection={(product) => {
						validateAndAddProduct({
							id: product.id,
							codigo: product.codigo,
							nome: product.descricao,
						});
						setNewProductMenuIsOpen(false);
					}}
					closeModal={() => setNewProductMenuIsOpen(false)}
				/>
			)}
		</ResponsiveMenu>
	);
}
