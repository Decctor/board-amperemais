import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import type { TProductAddOnOptionState, TUseProductState } from "@/state-hooks/use-product-state";
import { Check, Layers, LinkIcon, Pencil, Plus, Trash2, Unplug, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ProductVinculation from "../ProductVinculation";

type ProductAddOnsBlockProps = {
	addOns: TUseProductState["state"]["productAddOns"];
	addProductAddOn: TUseProductState["addProductAddOn"];
	updateProductAddOn: TUseProductState["updateProductAddOn"];
	removeProductAddOn: TUseProductState["removeProductAddOn"];
	addProductAddOnOption: TUseProductState["addProductAddOnOption"];
	updateProductAddOnOption: TUseProductState["updateProductAddOnOption"];
	removeProductAddOnOption: TUseProductState["removeProductAddOnOption"];
};

export default function ProductAddOnsBlock({
	addOns,
	addProductAddOn,
	updateProductAddOn,
	removeProductAddOn,
	addProductAddOnOption,
	updateProductAddOnOption,
	removeProductAddOnOption,
}: ProductAddOnsBlockProps) {
	const [newAddOnMenuIsOpen, setNewAddOnMenuIsOpen] = useState(false);
	const [editAddOnIndex, setEditAddOnIndex] = useState<number | null>(null);

	const validAddOns = addOns.map((addOn, index) => ({ ...addOn, originalIndex: index })).filter((addOn) => !addOn.deletar);
	const editingAddOn = isValidNumber(editAddOnIndex) ? addOns[editAddOnIndex as number] : null;

	return (
		<ResponsiveMenuSection title="ADICIONAIS" icon={<Layers className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full items-center justify-end gap-2">
				<Button onClick={() => setNewAddOnMenuIsOpen((prev) => !prev)} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR GRUPO
				</Button>
			</div>
			{validAddOns.length > 0 ? (
				<div className="flex flex-col gap-4 w-full">
					{validAddOns.map((addOn) => (
						<ProductAddOnGroupCard
							key={addOn.id || `temp-${addOn.originalIndex}`}
							addOn={addOn}
							index={addOn.originalIndex}
							handleEditClick={() => setEditAddOnIndex(addOn.originalIndex)}
							handleDeleteClick={() => removeProductAddOn(addOn.originalIndex)}
							addOption={addProductAddOnOption}
							updateOption={updateProductAddOnOption}
							removeOption={removeProductAddOnOption}
						/>
					))}
				</div>
			) : (
				<div className="w-full text-center text-sm font-medium tracking-tight text-muted-foreground">Nenhum grupo de adicionais criado.</div>
			)}
			{newAddOnMenuIsOpen ? (
				<NewProductAddOnMenu
					closeMenu={() => setNewAddOnMenuIsOpen(false)}
					addAddOn={(i) => {
						addProductAddOn(i);
						setNewAddOnMenuIsOpen(false);
					}}
				/>
			) : null}
			{editingAddOn && editAddOnIndex !== null ? (
				<EditProductAddOnMenu
					initialAddOn={editingAddOn}
					closeMenu={() => setEditAddOnIndex(null)}
					updateAddOn={(i) => {
						updateProductAddOn(editAddOnIndex, i);
						setEditAddOnIndex(null);
					}}
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

// ... MENUS ...

type NewProductAddOnMenuProps = {
	closeMenu: () => void;
	addAddOn: TUseProductState["addProductAddOn"];
};

function NewProductAddOnMenu({ closeMenu, addAddOn }: NewProductAddOnMenuProps) {
	const [holder, setHolder] = useState<TUseProductState["state"]["productAddOns"][number]>({
		nome: "",
		internoNome: "",
		minOpcoes: 0,
		maxOpcoes: 1,
		ativo: true,
		opcoes: [],
	});

	function updateHolder(updates: Partial<typeof holder>) {
		setHolder((prev) => ({ ...prev, ...updates }));
	}

	function validateAndAdd() {
		if (!holder.nome) return toast.error("Nome do grupo não informado.");
		if (!holder.internoNome) return toast.error("Nome interno do grupo não informado.");
		if (holder.minOpcoes < 0) return toast.error("Mínimo de opções inválido.");
		if (holder.maxOpcoes < 1) return toast.error("Máximo de opções deve ser pelo menos 1.");
		if (holder.maxOpcoes < holder.minOpcoes) return toast.error("Máximo de opções não pode ser menor que o mínimo.");

		addAddOn(holder);
	}

	return (
		<ResponsiveMenu
			menuTitle="NOVO GRUPO DE ADICIONAIS"
			menuDescription="Defina as regras para este grupo de adicionais."
			menuActionButtonText="ADICIONAR GRUPO"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={validateAndAdd}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<TextInput label="NOME (PARA O CLIENTE)" placeholder="Ex: Escolha o molho" value={holder.nome} handleChange={(v) => updateHolder({ nome: v })} />
			<TextInput
				label="NOME INTERNO"
				placeholder="Ex: Molhos Especiais"
				value={holder.internoNome}
				handleChange={(v) => updateHolder({ internoNome: v })}
			/>
			<div className="flex w-full gap-2">
				<NumberInput label="MÍNIMO" placeholder="0" value={holder.minOpcoes} handleChange={(v) => updateHolder({ minOpcoes: v })} />
				<NumberInput label="MÁXIMO" placeholder="1" value={holder.maxOpcoes} handleChange={(v) => updateHolder({ maxOpcoes: v })} />
			</div>
			<CheckboxInput labelTrue="ATIVO" labelFalse="INATIVO" checked={holder.ativo} handleChange={(v) => updateHolder({ ativo: v })} />
		</ResponsiveMenu>
	);
}

type EditProductAddOnMenuProps = {
	initialAddOn: TUseProductState["state"]["productAddOns"][number];
	closeMenu: () => void;
	updateAddOn: (info: TUseProductState["state"]["productAddOns"][number]) => void;
};

function EditProductAddOnMenu({ initialAddOn, closeMenu, updateAddOn }: EditProductAddOnMenuProps) {
	const [holder, setHolder] = useState(initialAddOn);

	function updateHolder(updates: Partial<typeof holder>) {
		setHolder((prev) => ({ ...prev, ...updates }));
	}

	function validateAndUpdate() {
		if (!holder.nome) return toast.error("Nome do grupo não informado.");
		if (!holder.internoNome) return toast.error("Nome interno do grupo não informado.");
		if (holder.minOpcoes < 0) return toast.error("Mínimo de opções inválido.");
		if (holder.maxOpcoes < 1) return toast.error("Máximo de opções deve ser pelo menos 1.");
		if (holder.maxOpcoes < holder.minOpcoes) return toast.error("Máximo de opções não pode ser menor que o mínimo.");

		updateAddOn(holder);
	}

	return (
		<ResponsiveMenu
			menuTitle="EDITAR GRUPO"
			menuDescription="Edite as regras para este grupo de adicionais."
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={validateAndUpdate}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<TextInput label="NOME (PARA O CLIENTE)" placeholder="Ex: Escolha o molho" value={holder.nome} handleChange={(v) => updateHolder({ nome: v })} />
			<TextInput
				label="NOME INTERNO"
				placeholder="Ex: Molhos Especiais"
				value={holder.internoNome}
				handleChange={(v) => updateHolder({ internoNome: v })}
			/>
			<div className="flex w-full gap-2">
				<NumberInput label="MÍNIMO" placeholder="0" value={holder.minOpcoes} handleChange={(v) => updateHolder({ minOpcoes: v })} />
				<NumberInput label="MÁXIMO" placeholder="1" value={holder.maxOpcoes} handleChange={(v) => updateHolder({ maxOpcoes: v })} />
			</div>
			<CheckboxInput labelTrue="ATIVO" labelFalse="INATIVO" checked={holder.ativo} handleChange={(v) => updateHolder({ ativo: v })} />
		</ResponsiveMenu>
	);
}

// ... CARDS ...

type ProductAddOnGroupCardProps = {
	addOn: TUseProductState["state"]["productAddOns"][number];
	index: number;
	handleEditClick: () => void;
	handleDeleteClick: () => void;
	addOption: TUseProductState["addProductAddOnOption"];
	updateOption: TUseProductState["updateProductAddOnOption"];
	removeOption: TUseProductState["removeProductAddOnOption"];
};

function ProductAddOnGroupCard({
	addOn,
	index,
	handleEditClick,
	handleDeleteClick,
	addOption,
	updateOption,
	removeOption,
}: ProductAddOnGroupCardProps) {
	const validOptions = addOn.opcoes.map((opt, idx) => ({ ...opt, originalIndex: idx })).filter((opt) => !opt.deletar);

	function handleAddNewOption() {
		addOption(index, {
			nome: "",
			codigo: "",
			precoDelta: 0,
			maxQtdePorItem: 1,
			ativo: true,
			quantidadeConsumo: 1,
		});
	}

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border p-3 shadow-2xs")}>
			{/* HEADER DO GRUPO */}
			<div className="flex w-full items-start justify-between gap-4 border-b border-border pb-2">
				<div className="flex flex-col gap-0.5">
					<h1 className="text-sm font-bold tracking-tight">{addOn.nome}</h1>
					<p className="text-xs text-muted-foreground italic">{addOn.internoNome}</p>
					<div className="flex items-center gap-2 mt-1">
						<span className="text-[0.65rem] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">MÍN: {addOn.minOpcoes}</span>
						<span className="text-[0.65rem] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">MÁX: {addOn.maxOpcoes}</span>
						<span
							className={cn(
								"text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md",
								addOn.ativo ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
							)}
						>
							{addOn.ativo ? "ATIVO" : "INATIVO"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button onClick={handleEditClick} size="icon" variant="ghost" className="h-7 w-7">
						<Pencil className="w-4 h-4 text-muted-foreground" />
					</Button>
					<Button onClick={handleDeleteClick} size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive">
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* LISTA DE OPÇÕES */}
			<div className="flex flex-col w-full gap-2 mt-1">
				{validOptions.map((option) => (
					<ProductAddOnOptionCard
						key={option.id || `temp-opt-${option.originalIndex}`}
						option={option}
						updateOption={(updates) => updateOption(index, option.originalIndex, updates)}
						removeOption={() => removeOption(index, option.originalIndex)}
					/>
				))}
			</div>

			{/* BOTÃO ADICIONAR OPÇÃO */}
			<div className="w-full flex justify-center mt-2">
				<Button
					onClick={handleAddNewOption}
					size="sm"
					variant="outline"
					className="w-full border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 h-8 text-xs"
				>
					<Plus className="w-3.5 h-3.5 mr-1" />
					ADICIONAR OPÇÃO
				</Button>
			</div>
		</div>
	);
}

type ProductAddOnOptionCardProps = {
	option: TProductAddOnOptionState;
	updateOption: (updates: Partial<TProductAddOnOptionState>) => void;
	removeOption: () => void;
};

function ProductAddOnOptionCard({ option, updateOption, removeOption }: ProductAddOnOptionCardProps) {
	const [vinculationModalIsOpen, setVinculationModalIsOpen] = useState(false);
	return (
		<div className="w-full grid grid-cols-12 gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border/50">
			{option.produtoConsumo ? (
				<div className="col-span-12 flex items-center justify-between gap-2 p-1.5 bg-primary/10 rounded-md border border-primary/20 mb-1">
					<div className="flex items-center gap-2">
						<LinkIcon className="w-3.5 h-3.5 text-primary" />
						<div className="flex flex-col">
							<span className="text-[0.65rem] font-bold text-primary/80 uppercase tracking-tight">CONSUMO DE ESTOQUE VINCULADO A:</span>
							<p className="text-xs font-medium text-primary line-clamp-1">{option.produtoConsumo}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<NumberInput
							placeholder="1"
							value={option.quantidadeConsumo}
							handleChange={(v) => updateOption({ quantidadeConsumo: v })}
							label="QTD. CONSUMO"
							labelClassName="text-[0.65rem] text-primary/80"
							holderClassName="!p-1.5 h-7 w-20 bg-background/50 border-primary/20"
						/>
						<Button
							onClick={() => updateOption({ produtoConsumo: null, quantidadeConsumo: 1 })}
							size="icon"
							variant="ghost"
							className="h-7 w-7 text-primary/60 hover:text-destructive hover:bg-destructive/10"
							title="Desvincular Produto"
						>
							<Unplug className="w-3.5 h-3.5" />
						</Button>
					</div>
				</div>
			) : (
				<div className="col-span-12 flex items-center justify-center py-1 mb-1">
					<Button
						onClick={() => setVinculationModalIsOpen(true)}
						size="sm"
						variant="ghost"
						className="h-7 text-xs text-muted-foreground hover:text-primary gap-1.5 border border-dashed border-border hover:border-primary/50 bg-background/50 w-full"
					>
						<LinkIcon className="w-3 h-3" />
						VINCULAR ITEM DE CONSUMO NO ESTOQUE
					</Button>
				</div>
			)}

			<div className="col-span-12 sm:col-span-6 lg:col-span-5">
				<TextInput
					placeholder="Nome da Opção"
					value={option.nome}
					handleChange={(v) => updateOption({ nome: v })}
					label="NOME"
					labelClassName="text-[0.65rem]"
					holderClassName="!p-2 h-8"
				/>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<TextInput
					placeholder="Cód. SKU"
					value={option.codigo}
					handleChange={(v) => updateOption({ codigo: v })}
					label="CÓD. SKU"
					labelClassName="text-[0.65rem]"
					holderClassName="!p-2 h-8"
				/>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<NumberInput
					placeholder="0,00"
					value={option.precoDelta}
					handleChange={(v) => updateOption({ precoDelta: v })}
					label="DIFERENÇA DE PREÇO"
					labelClassName="text-[0.65rem]"
					holderClassName="!p-2 h-8"
				/>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-2">
				<NumberInput
					placeholder="1"
					value={option.maxQtdePorItem}
					handleChange={(v) => updateOption({ maxQtdePorItem: v })}
					label="MAX QTD."
					labelClassName="text-[0.65rem]"
					holderClassName="!p-2 h-8"
				/>
			</div>
			<div className="col-span-6 sm:col-span-3 lg:col-span-1 flex items-center justify-end h-full pt-1 gap-1">
				<Button
					onClick={() => updateOption({ ativo: !option.ativo })}
					size="icon"
					variant="ghost"
					className={cn("h-8 w-8", option.ativo ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground")}
					title={option.ativo ? "Ativo" : "Inativo"}
				>
					<Check className={cn("w-4 h-4", !option.ativo && "opacity-20")} />
				</Button>
				<Button
					onClick={removeOption}
					size="icon"
					variant="ghost"
					className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
					title="Remover Opção"
				>
					<Trash2 className="w-4 h-4" />
				</Button>
			</div>
			{vinculationModalIsOpen ? (
				<ProductVinculation
					closeModal={() => setVinculationModalIsOpen(false)}
					handleSelection={(product, variant) => {
						updateOption(
							variant ? { produtoConsumo: variant.nome, produtoVarianteId: variant.id } : { produtoConsumo: product.descricao, produtoId: product.id },
						);
						setVinculationModalIsOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}
