import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { useProductAddOnById } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import { TSingleProductAddOnState, TUseProductAddOnState, useProductAddOnState } from "@/state-hooks/use-product-state";
import { Check, LinkIcon, Plus, Trash2, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ProductVinculation from "../ProductVinculation";

type AddOnMenuProps = {
	addOnId?: string;
	closeMenu: () => void;
	submitAddOn: (state: TUseProductAddOnState["state"]) => void;
	submitAddOnIsLoading: boolean;
};

export default function AddOnMenu({ addOnId, closeMenu, submitAddOn, submitAddOnIsLoading }: AddOnMenuProps) {
	if (addOnId) {
		return <AddOnMenuPersisted addOnId={addOnId} closeMenu={closeMenu} submitAddOn={submitAddOn} submitAddOnIsLoading={submitAddOnIsLoading} />;
	}

	return <AddOnMenuNonPersisted closeMenu={closeMenu} submitAddOn={submitAddOn} submitAddOnIsLoading={submitAddOnIsLoading} />;
}

type AddOnMenuPersistedProps = {
	addOnId: string;
	closeMenu: () => void;
	submitAddOn: (state: TUseProductAddOnState["state"]) => void;
	submitAddOnIsLoading: boolean;
};

function AddOnMenuPersisted({ addOnId, closeMenu, submitAddOn, submitAddOnIsLoading }: AddOnMenuPersistedProps) {
	const { data: addOn, isLoading, error } = useProductAddOnById({ productAddOnId: addOnId });
	const { state, updateAddOn, addOption, updateOption, removeOption, redefineState } = useProductAddOnState({});

	useEffect(() => {
		if (addOn) {
			redefineState({
				id: addOn.id,
				nome: addOn.nome,
				internoNome: addOn.internoNome ?? "",
				minOpcoes: addOn.minOpcoes ?? 0,
				maxOpcoes: addOn.maxOpcoes ?? 1,
				ativo: addOn.ativo ?? true,
				opcoes: addOn.opcoes.map((opcao) => ({
					id: opcao.id,
					nome: opcao.nome,
					codigo: opcao.codigo ?? "",
					ativo: opcao.ativo ?? true,
					produtoId: opcao.produtoId ?? null,
					produtoVarianteId: opcao.produtoVarianteId ?? null,
					produtoConsumo: opcao.produtoVariante?.nome ?? opcao.produto?.descricao ?? null,
					quantidadeConsumo: opcao.quantidadeConsumo ?? 1,
					precoDelta: opcao.precoDelta ?? 0,
					maxQtdePorItem: opcao.maxQtdePorItem ?? 1,
				})),
			});
		}
	}, [addOn, redefineState]);

	return (
		<AddOnMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={isLoading}
			stateError={error ? error.message : null}
			updateAddOn={updateAddOn}
			addOption={addOption}
			updateOption={updateOption}
			removeOption={removeOption}
			submitionIsLoading={submitAddOnIsLoading}
			submitAddOn={() => submitAddOn(state)}
			menuTitle="EDITAR ADICIONAL"
			menuDescription="Preencha os campos abaixo para editar o grupo de adicionais"
			menuActionButtonText="ATUALIZAR ADICIONAL"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type AddOnMenuNonPersistedProps = {
	closeMenu: () => void;
	submitAddOn: (state: TUseProductAddOnState["state"]) => void;
	submitAddOnIsLoading: boolean;
};

function AddOnMenuNonPersisted({ closeMenu, submitAddOn, submitAddOnIsLoading }: AddOnMenuNonPersistedProps) {
	const { state, updateAddOn, addOption, updateOption, removeOption } = useProductAddOnState({});

	return (
		<AddOnMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={false}
			stateError={null}
			updateAddOn={updateAddOn}
			addOption={addOption}
			updateOption={updateOption}
			removeOption={removeOption}
			submitionIsLoading={submitAddOnIsLoading}
			submitAddOn={() => submitAddOn(state)}
			menuTitle="CRIAR ADICIONAL"
			menuDescription="Preencha os campos abaixo para criar o grupo de adicionais"
			menuActionButtonText="CRIAR ADICIONAL"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type AddOnMenuContentProps = {
	closeMenu: () => void;
	state: TUseProductAddOnState["state"];
	stateIsLoading: boolean;
	stateError: string | null;
	updateAddOn: TUseProductAddOnState["updateAddOn"];
	addOption: TUseProductAddOnState["addOption"];
	updateOption: TUseProductAddOnState["updateOption"];
	removeOption: TUseProductAddOnState["removeOption"];
	submitionIsLoading: boolean;
	submitAddOn: (state: TUseProductAddOnState["state"]) => void;
	menuTitle: string;
	menuDescription: string;
	menuActionButtonText: string;
	menuCancelButtonText: string;
};

function AddOnMenuContent({
	closeMenu,
	state,
	stateIsLoading,
	stateError,
	updateAddOn,
	addOption,
	updateOption,
	removeOption,
	submitionIsLoading,
	submitAddOn,
	menuTitle,
	menuDescription,
	menuActionButtonText,
	menuCancelButtonText,
}: AddOnMenuContentProps) {
	function validateAndSubmit() {
		if (!state.nome) return toast.error("Nome do grupo não informado.");
		if (!state.internoNome) return toast.error("Nome interno do grupo não informado.");
		if (state.minOpcoes < 0) return toast.error("Mínimo de opções inválido.");
		if (state.maxOpcoes < 1) return toast.error("Máximo de opções deve ser pelo menos 1.");
		if (state.maxOpcoes < state.minOpcoes) return toast.error("Máximo de opções não pode ser menor que o mínimo.");

		submitAddOn(state);
	}

	const validOptions = state.opcoes.map((option, index) => ({ ...option, originalIndex: index })).filter((option) => !option.deletar);

	return (
		<ResponsiveMenu
			menuTitle={menuTitle}
			menuDescription={menuDescription}
			menuActionButtonText={menuActionButtonText}
			menuCancelButtonText={menuCancelButtonText}
			closeMenu={closeMenu}
			actionFunction={validateAndSubmit}
			actionIsLoading={submitionIsLoading}
			stateIsLoading={stateIsLoading}
			stateError={stateError}
		>
			<TextInput label="NOME" placeholder="Digite o nome do adicional" value={state.nome} handleChange={(value) => updateAddOn({ nome: value })} />
			<TextInput
				label="NOME INTERNO"
				placeholder="Digite o nome interno do adicional"
				value={state.internoNome}
				handleChange={(value) => updateAddOn({ internoNome: value })}
			/>
			<div className="flex w-full gap-2">
				<NumberInput label="MÍNIMO" placeholder="0" value={state.minOpcoes} handleChange={(value) => updateAddOn({ minOpcoes: value })} />
				<NumberInput label="MÁXIMO" placeholder="1" value={state.maxOpcoes} handleChange={(value) => updateAddOn({ maxOpcoes: value })} />
			</div>
			<CheckboxInput labelTrue="ATIVO" labelFalse="INATIVO" checked={state.ativo} handleChange={(value) => updateAddOn({ ativo: value })} />
			<div className="flex w-full flex-col gap-2">
				<div className="flex w-full items-center justify-between gap-2">
					<h2 className="text-xs font-bold tracking-tight">OPÇÕES</h2>
					<Button onClick={() => addOption()} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
						<Plus className="h-4 min-h-4 w-4 min-w-4" />
						ADICIONAR OPÇÃO
					</Button>
				</div>
				{validOptions.length > 0 ? (
					validOptions.map((option) => (
						<ProductAddOnOptionCard
							key={option.id || `temp-opt-${option.originalIndex}`}
							option={option}
							updateOption={(updates) => updateOption(option.originalIndex, updates)}
							removeOption={() => removeOption(option.originalIndex)}
						/>
					))
				) : (
					<p className="text-center text-sm font-medium tracking-tight text-muted-foreground">Nenhuma opção criada.</p>
				)}
			</div>
		</ResponsiveMenu>
	);
}

type ProductAddOnOptionCardProps = {
	option: TSingleProductAddOnState["opcoes"][number];
	updateOption: (updates: Partial<TSingleProductAddOnState["opcoes"][number]>) => void;
	removeOption: () => void;
};

function ProductAddOnOptionCard({ option, updateOption, removeOption }: ProductAddOnOptionCardProps) {
	const [vinculationModalIsOpen, setVinculationModalIsOpen] = useState(false);

	const inputLabelClass = "text-[0.65rem] whitespace-nowrap";
	const inputHolderClass = "!p-2 h-8";
	const inputWidth = "100%";

	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border/50 bg-muted/30 p-2">
			{option.produtoConsumo ? (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-primary/10 p-1.5">
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<LinkIcon className="h-3.5 w-3.5 shrink-0 text-foreground" />
						<div className="flex min-w-0 flex-col">
							<span className="text-[0.65rem] font-bold uppercase tracking-tight text-foreground/80">CONSUMO DE ESTOQUE VINCULADO A:</span>
							<p className="line-clamp-1 text-xs font-medium text-foreground">{option.produtoConsumo}</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<NumberInput
							placeholder="1"
							value={option.quantidadeConsumo}
							handleChange={(value) => updateOption({ quantidadeConsumo: value })}
							label="QTD. CONSUMO"
							width={inputWidth}
							labelClassName="text-[0.65rem] text-foreground/80"
							holderClassName="!p-1.5 h-7 w-20 bg-background/50 border-border"
						/>
						<Button
							onClick={() => updateOption({ produtoConsumo: null, produtoId: null, produtoVarianteId: null, quantidadeConsumo: 1 })}
							size="icon"
							variant="ghost"
							className="h-7 w-7 text-foreground/60 hover:bg-destructive/10 hover:text-destructive"
							title="Desvincular produto"
						>
							<Unplug className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center py-1">
					<Button
						onClick={() => setVinculationModalIsOpen(true)}
						size="sm"
						variant="ghost"
						className="h-7 w-full gap-1.5 border border-dashed border-border bg-background/50 text-xs text-muted-foreground hover:border-border/50 hover:text-foreground"
					>
						<LinkIcon className="h-3 w-3" />
						VINCULAR ITEM DE CONSUMO NO ESTOQUE
					</Button>
				</div>
			)}
			<TextInput
				placeholder="Nome da opção"
				value={option.nome}
				handleChange={(value) => updateOption({ nome: value })}
				label="NOME"
				width={inputWidth}
				labelClassName={inputLabelClass}
				holderClassName={inputHolderClass}
			/>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.75fr)_auto] sm:items-end">
				<div className="min-w-0">
					<TextInput
						placeholder="Cód. SKU"
						value={option.codigo}
						handleChange={(value) => updateOption({ codigo: value })}
						label="CÓD. SKU"
						width={inputWidth}
						labelClassName={inputLabelClass}
						holderClassName={inputHolderClass}
					/>
				</div>
				<div className="min-w-0">
					<NumberInput
						placeholder="0,00"
						value={option.precoDelta}
						handleChange={(value) => updateOption({ precoDelta: value })}
						label="DIF. PREÇO"
						width={inputWidth}
						labelClassName={inputLabelClass}
						holderClassName={inputHolderClass}
					/>
				</div>
				<div className="min-w-0">
					<NumberInput
						placeholder="1"
						value={option.maxQtdePorItem}
						handleChange={(value) => updateOption({ maxQtdePorItem: value })}
						label="MAX QTD."
						width={inputWidth}
						labelClassName={inputLabelClass}
						holderClassName={inputHolderClass}
					/>
				</div>
				<div className="col-span-2 flex shrink-0 items-center justify-end gap-1 sm:col-span-1 sm:pb-0.5">
					<Button
						onClick={() => updateOption({ ativo: !option.ativo })}
						size="icon"
						variant="ghost"
						className={cn("h-8 w-8", option.ativo ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground")}
						title={option.ativo ? "Ativo" : "Inativo"}
					>
						<Check className={cn("h-4 w-4", !option.ativo && "opacity-20")} />
					</Button>
					<Button
						onClick={removeOption}
						size="icon"
						variant="ghost"
						className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
						title="Remover opção"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
			{vinculationModalIsOpen ? (
				<ProductVinculation
					closeModal={() => setVinculationModalIsOpen(false)}
					handleSelection={(product, variant) => {
						updateOption(
							variant
								? { produtoConsumo: variant.nome, produtoId: null, produtoVarianteId: variant.id }
								: { produtoConsumo: product.descricao, produtoId: product.id, produtoVarianteId: null },
						);
						setVinculationModalIsOpen(false);
					}}
				/>
			) : null}
		</div>
	);
}
