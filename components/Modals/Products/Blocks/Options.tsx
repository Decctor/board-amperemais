import TextInput from "@/components/Inputs/TextInput";

import ColorPresetPicker from "@/components/Modals/Products/Blocks/ColorPresetPicker";

import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";

import { Button } from "@/components/ui/button";

import {

	buildColorOptionValues,

	COLOR_AXIS_SEED_PRESETS,

	COLOR_UNKNOWN_HEX,

	isColorNameTaken,

	resolveColorValueFromDraftName,

	type TColorPreset,

} from "@/lib/products/color-presets";

import { computeVariantMatrixCoverage } from "@/lib/products/variant-matrix";

import { cn } from "@/lib/utils";

import type { TProductOptionState, TUseProductState } from "@/state-hooks/use-product-state";

import { Palette, Plus, Ruler, Sparkles, Trash2, Type, X } from "lucide-react";

import type { ReactNode } from "react";

import { useMemo, useState } from "react";

import { toast } from "sonner";



type ProductStateOptionsBlockProps = {

	options: TUseProductState["state"]["productOptions"];

	variants: TUseProductState["state"]["productVariants"];

	addProductOption: TUseProductState["addProductOption"];

	updateProductOption: TUseProductState["updateProductOption"];

	removeProductOption: TUseProductState["removeProductOption"];

	addProductOptionValue: TUseProductState["addProductOptionValue"];

	updateProductOptionValue: TUseProductState["updateProductOptionValue"];

	removeProductOptionValue: TUseProductState["removeProductOptionValue"];

	generateVariantMatrix: TUseProductState["generateVariantMatrix"];

	baseDefaults?: { precoVenda?: number | null; precoCusto?: number | null };

	embedded?: boolean;

};



export default function ProductStateOptionsBlock({

	options,

	variants,

	addProductOption,

	updateProductOption,

	removeProductOption,

	addProductOptionValue,

	updateProductOptionValue,

	removeProductOptionValue,

	generateVariantMatrix,

	baseDefaults,

	embedded = false,

}: ProductStateOptionsBlockProps) {

	const visibleOptions = options.map((option, index) => ({ option, index })).filter(({ option }) => !option.deletar);



	const matrixCoverage = useMemo(

		() => computeVariantMatrixCoverage({ options, variants }),

		[options, variants],

	);



	function handleGenerate() {

		if (matrixCoverage.missingCount === 0) return toast.error("Adicione ao menos um eixo com valores para gerar variantes.");

		generateVariantMatrix({

			precoVenda: baseDefaults?.precoVenda ?? undefined,

			precoCusto: baseDefaults?.precoCusto ?? undefined,

		});

		const count = matrixCoverage.missingCount;

		toast.success(`${count} ${count === 1 ? "variante adicionada" : "variantes adicionadas"}. Revise preços e estoque abaixo.`);

	}



	function handleQuickAddColorAxis() {

		addProductOption({

			nome: "Cor",

			tipo: "COR",

			valores: buildColorOptionValues(COLOR_AXIS_SEED_PRESETS),

		});

	}



	const content = (

		<>

			<div className="flex w-full items-center justify-between gap-2">

				<p className="text-xs text-muted-foreground">Eixos como tamanho e cor geram as variantes automaticamente.</p>

				<Button

					onClick={() => addProductOption({ nome: "", tipo: "TEXTO" })}

					size="fit"

					variant="ghost"

					className="flex shrink-0 items-center gap-1 px-2 py-1 text-xs"

				>

					<Plus className="h-4 min-h-4 w-4 min-w-4" />

					ADICIONAR EIXO

				</Button>

			</div>



			{visibleOptions.length > 0 ? (

				<div className="flex w-full flex-col gap-3">

					{visibleOptions.map(({ option, index }) => (

						<ProductOptionRow

							key={option.referenciaId}

							option={option}

							onUpdate={(updates) => updateProductOption(index, updates)}

							onRemove={() => removeProductOption(index)}

							onAddValue={(value) => addProductOptionValue(index, value)}

							onUpdateValue={(valueIndex, updates) => updateProductOptionValue(index, valueIndex, updates)}

							onRemoveValue={(valueIndex) => removeProductOptionValue(index, valueIndex)}

						/>

					))}

				</div>

			) : (

				<OptionsEmptyState

					onQuickAddText={() => addProductOption({ nome: "Tamanho", tipo: "TEXTO" })}

					onQuickAddColors={handleQuickAddColorAxis}

				/>

			)}



			{matrixCoverage.missingCount > 0 ? (

				<div className="flex w-full flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">

					<div className="flex min-w-0 flex-col gap-0.5">

						<p className="truncate text-sm font-bold tracking-tight text-foreground">

							{matrixCoverage.matrixAxes.map((axis) => `${axis.count} ${axis.nome}`).join("  ×  ")}

						</p>

						<p className="text-xs text-muted-foreground">

							{matrixCoverage.existingCount === 0

								? `${matrixCoverage.matrixCount} ${matrixCoverage.matrixCount === 1 ? "combinação" : "combinações"}. Variantes já editadas são preservadas.`

								: `${matrixCoverage.existingCount} de ${matrixCoverage.matrixCount} combinações criadas. Faltam ${matrixCoverage.missingCount}.`}

						</p>

					</div>

					<Button onClick={handleGenerate} size="sm" className="shrink-0 gap-1.5">

						<Sparkles className="h-4 w-4" />

						{matrixCoverage.existingCount === 0

							? "GERAR VARIANTES"

							: `GERAR ${matrixCoverage.missingCount} NOVA${matrixCoverage.missingCount === 1 ? "" : "S"}`}

					</Button>

				</div>

			) : null}

		</>

	);



	if (embedded) return content;



	return (

		<ResponsiveMenuSection title="EIXOS DE VARIAÇÃO" icon={<Ruler className="h-4 min-h-4 w-4 min-w-4" />}>

			{content}

		</ResponsiveMenuSection>

	);

}



type ProductOptionRowProps = {

	option: TProductOptionState;

	onUpdate: (updates: Partial<Pick<TProductOptionState, "nome" | "tipo">>) => void;

	onRemove: () => void;

	onAddValue: (value: { nome: string; valorAuxiliar?: string | null }) => void;

	onUpdateValue: (valueIndex: number, updates: { nome?: string; valorAuxiliar?: string | null }) => void;

	onRemoveValue: (valueIndex: number) => void;

};



function ProductOptionRow({ option, onUpdate, onRemove, onAddValue, onUpdateValue, onRemoveValue }: ProductOptionRowProps) {

	const [draft, setDraft] = useState("");

	const isColor = option.tipo === "COR";

	const visibleValues = option.valores.map((value, valueIndex) => ({ value, valueIndex })).filter(({ value }) => !value.deletar);

	const existingColorNames = visibleValues.map(({ value }) => value.nome);



	function tryAddColorValue(preset: { nome: string; hex: string }) {

		if (isColorNameTaken(existingColorNames, preset.nome)) {

			toast.error("Cor já adicionada.");

			return false;

		}

		onAddValue({ nome: preset.nome, valorAuxiliar: preset.hex });

		return true;

	}



	function handlePresetSelect(preset: TColorPreset) {

		tryAddColorValue(preset);

	}



	function commitDraft() {

		const parts = draft

			.split(",")

			.map((part) => part.trim())

			.filter(Boolean);

		if (parts.length === 0) return;



		const batchColorNames = [...existingColorNames];



		for (const part of parts) {

			if (isColor) {

				const resolved = resolveColorValueFromDraftName(part);

				if (isColorNameTaken(batchColorNames, resolved.nome)) {

					toast.error("Cor já adicionada.");

					continue;

				}

				onAddValue({ nome: resolved.nome, valorAuxiliar: resolved.hex });

				batchColorNames.push(resolved.nome);

			} else {

				onAddValue({ nome: part, valorAuxiliar: null });

			}

		}

		setDraft("");

	}



	return (

		<div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">

			<div className="flex w-full items-center gap-2">

				<TextInput

					label="EIXO"

					showLabel={false}

					placeholder="Ex: Tamanho, Cor, Material"

					value={option.nome}

					handleChange={(value) => onUpdate({ nome: value })}

					holderClassName="!p-2 h-9"

				/>

				<div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/40 p-0.5">

					<TypeToggleButton active={!isColor} icon={<Type className="h-3.5 w-3.5" />} label="Texto" onClick={() => onUpdate({ tipo: "TEXTO" })} />

					<TypeToggleButton active={isColor} icon={<Palette className="h-3.5 w-3.5" />} label="Cor" onClick={() => onUpdate({ tipo: "COR" })} />

				</div>

				<Button

					onClick={onRemove}

					size="icon"

					variant="ghost"

					className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"

					title="Remover eixo"

				>

					<Trash2 className="h-4 w-4" />

				</Button>

			</div>



			<div className="flex w-full flex-col gap-1.5">

				<div className="flex w-full flex-wrap items-center gap-1.5">

					{visibleValues.map(({ value, valueIndex }) => (

						<ProductOptionValuePill

							key={value.referenciaId}

							nome={value.nome}

							isColor={isColor}

							hex={value.valorAuxiliar ?? COLOR_UNKNOWN_HEX}

							onChangeName={(nome) => onUpdateValue(valueIndex, { nome })}

							onChangeHex={(hex) => onUpdateValue(valueIndex, { valorAuxiliar: hex })}

							onRemove={() => onRemoveValue(valueIndex)}

						/>

					))}

					{isColor ? <ColorPresetPicker onSelect={handlePresetSelect} /> : null}

					<input

						value={draft}

						onChange={(event) => setDraft(event.target.value)}

						onKeyDown={(event) => {

							if (event.key === "Enter") {

								event.preventDefault();

								commitDraft();

							}

							if (event.key === "Backspace" && draft.length === 0 && visibleValues.length > 0) {

								onRemoveValue(visibleValues[visibleValues.length - 1].valueIndex);

							}

						}}

						onBlur={commitDraft}

						placeholder={visibleValues.length === 0 ? (isColor ? "Digite ou use presets" : "P, M, G e Enter") : "+ valor"}

						aria-label={`Adicionar valor ao eixo ${option.nome || ""}`.trim()}

						className="h-7 min-w-[7rem] flex-1 rounded-full bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70"

					/>

				</div>

				{isColor && visibleValues.length === 0 ? (

					<p className="px-1 text-[0.65rem] text-muted-foreground">Presets adicionam nome e cor juntos.</p>

				) : null}

			</div>

		</div>

	);

}



function TypeToggleButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {

	return (

		<button

			type="button"

			onClick={onClick}

			className={cn(

				"flex items-center gap-1 rounded-md px-2 py-1 text-[0.7rem] font-bold tracking-tight transition-colors",

				active ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",

			)}

		>

			{icon}

			{label}

		</button>

	);

}



type ProductOptionValuePillProps = {

	nome: string;

	isColor: boolean;

	hex: string;

	onChangeName: (nome: string) => void;

	onChangeHex: (hex: string) => void;

	onRemove: () => void;

};



function ProductOptionValuePill({ nome, isColor, hex, onChangeName, onChangeHex, onRemove }: ProductOptionValuePillProps) {

	return (

		<div className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2 pr-1">

			{isColor ? (

				<label className="relative h-3.5 w-3.5 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border" title="Editar cor">

					<span className="absolute inset-0" style={{ backgroundColor: hex }} />

					<input type="color" value={hex} onChange={(event) => onChangeHex(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />

				</label>

			) : null}

			<input

				value={nome}

				onChange={(event) => onChangeName(event.target.value)}

				size={Math.max(nome.length, 1)}

				className="bg-transparent text-xs font-medium text-foreground outline-none"

				aria-label="Nome do valor"

			/>

			<button

				type="button"

				onClick={onRemove}

				className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"

				title="Remover valor"

			>

				<X className="h-3 w-3" />

			</button>

		</div>

	);

}



function OptionsEmptyState({

	onQuickAddText,

	onQuickAddColors,

}: {

	onQuickAddText: () => void;

	onQuickAddColors: () => void;

}) {

	return (

		<div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6">

			<p className="text-center text-sm font-medium tracking-tight text-muted-foreground">Nenhum eixo de variação. Comece por um destes:</p>

			<div className="flex flex-wrap items-center justify-center gap-2">

				<Button onClick={onQuickAddText} size="sm" variant="secondary" className="gap-1.5">

					<Ruler className="h-4 w-4" />

					TAMANHO

				</Button>

				<Button onClick={onQuickAddColors} size="sm" variant="secondary" className="gap-1.5">

					<Palette className="h-4 w-4" />

					CORES

				</Button>

			</div>

		</div>

	);

}

