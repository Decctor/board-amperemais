import NumberInput from "@/components/Inputs/NumberInput";
import SelectProductWithVariants, { type TSelectProductWithVariantsValue } from "@/components/Inputs/SelectProductWithVariants";
import DurationInput from "@/components/Inputs/DurationInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TProductionRecipeState, TUseInternalProductionRecipeState } from "@/state-hooks/use-internal-production-recipe-state";
import { CirclePlus, Package, PackageCheck, Trash2 } from "lucide-react";

type ProductionDurationOptionValue = "MINUTOS" | "HORAS" | "DIAS";

const VALIDITY_DURATION_OPTIONS: { id: string; label: string; value: ProductionDurationOptionValue }[] = [
	{ id: "MINUTOS", label: "Minutos", value: "MINUTOS" },
	{ id: "HORAS", label: "Horas", value: "HORAS" },
	{ id: "DIAS", label: "Dias", value: "DIAS" },
];

type ProductionRecipeInputsBlockProps = {
	productionRecipeInputs: TProductionRecipeState["productionRecipeInputs"];
	addProductionRecipeInput: TUseInternalProductionRecipeState["addProductionRecipeInput"];
	updateProductionRecipeInput: TUseInternalProductionRecipeState["updateProductionRecipeInput"];
	removeProductionRecipeInput: TUseInternalProductionRecipeState["removeProductionRecipeInput"];
};

export function ProductionRecipeInputsBlock({
	productionRecipeInputs,
	addProductionRecipeInput,
	updateProductionRecipeInput,
	removeProductionRecipeInput,
}: ProductionRecipeInputsBlockProps) {
	const visibleInputs = productionRecipeInputs.map((item, index) => ({ item, index })).filter(({ item }) => !item.deletar);

	return (
		<ResponsiveMenuSection title="INSUMOS" icon={<Package className="h-4 w-4" />}>
			<div className="flex flex-col gap-3">
				{visibleInputs.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
						Adicione os produtos consumidos para produzir esta receita.
					</div>
				) : null}
				{visibleInputs.map(({ item, index }, visibleIndex) => (
					<div key={item.id ?? index} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-semibold text-muted-foreground">Insumo {visibleIndex + 1}</p>
							<Button
								type="button"
								variant="ghost-destructive"
								size="icon-xs"
								onClick={() => removeProductionRecipeInput(index)}
								aria-label="Remover insumo"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
						<SelectProductWithVariants
							label="PRODUTO"
							value={item.produtoId ? { productId: item.produtoId, productVariantId: item.produtoVarianteId } : null}
							selectedLabel={resolveProductLabel(item)}
							resetOptionLabel="Selecione um produto"
							handleChange={(value) => updateProductionRecipeInput(index, mapProductSelection(value))}
							onReset={() => updateProductionRecipeInput(index, { produtoId: "", produtoVarianteId: null, produto: null, produtoVariante: null })}
						/>
						<NumberInput
							label="QUANTIDADE"
							value={item.quantidade}
							placeholder="0"
							required
							handleChange={(quantidade) => updateProductionRecipeInput(index, { quantidade })}
						/>
					</div>
				))}
				<Button
					type="button"
					variant="outline"
					className="w-full gap-2"
					onClick={() =>
						addProductionRecipeInput({
							produtoId: "",
							produtoVarianteId: null,
							quantidade: 1,
							produto: null,
							produtoVariante: null,
						})
					}
				>
					<CirclePlus className="h-4 w-4" />
					ADICIONAR INSUMO
				</Button>
			</div>
		</ResponsiveMenuSection>
	);
}

type ProductionRecipeOutputsBlockProps = {
	productionRecipeOutputs: TProductionRecipeState["productionRecipeOutputs"];
	addProductionRecipeOutput: TUseInternalProductionRecipeState["addProductionRecipeOutput"];
	updateProductionRecipeOutput: TUseInternalProductionRecipeState["updateProductionRecipeOutput"];
	removeProductionRecipeOutput: TUseInternalProductionRecipeState["removeProductionRecipeOutput"];
};

export function ProductionRecipeOutputsBlock({
	productionRecipeOutputs,
	addProductionRecipeOutput,
	updateProductionRecipeOutput,
	removeProductionRecipeOutput,
}: ProductionRecipeOutputsBlockProps) {
	const visibleOutputs = productionRecipeOutputs.map((item, index) => ({ item, index })).filter(({ item }) => !item.deletar);

	return (
		<ResponsiveMenuSection title="SAÍDAS" icon={<PackageCheck className="h-4 w-4" />}>
			<div className="flex flex-col gap-3">
				{visibleOutputs.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
						Adicione os produtos gerados ao concluir esta receita.
					</div>
				) : null}
				{visibleOutputs.map(({ item, index }, visibleIndex) => (
					<div key={item.id ?? index} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-semibold text-muted-foreground">Saída {visibleIndex + 1}</p>
							<Button
								type="button"
								variant="ghost-destructive"
								size="icon-xs"
								onClick={() => removeProductionRecipeOutput(index)}
								aria-label="Remover saída"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
						<SelectProductWithVariants
							label="PRODUTO GERADO"
							value={item.produtoId ? { productId: item.produtoId, productVariantId: item.produtoVarianteId } : null}
							selectedLabel={resolveProductLabel(item)}
							resetOptionLabel="Selecione um produto"
							handleChange={(value) => updateProductionRecipeOutput(index, mapProductSelection(value))}
							onReset={() => updateProductionRecipeOutput(index, { produtoId: "", produtoVarianteId: null, produto: null, produtoVariante: null })}
						/>
						<div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
							<NumberInput
								label="QUANTIDADE"
								value={item.quantidade}
								placeholder="0"
								required
								handleChange={(quantidade) => updateProductionRecipeOutput(index, { quantidade })}
							/>
							<DurationInput
								label="PRAZO DE VALIDADE"
								value={item.prazoValidadeValor}
								measure={item.prazoValidadeMedida}
								options={VALIDITY_DURATION_OPTIONS}
								valuePlaceholder="Prazo"
								measurePlaceholder="Medida"
								helperText="Opcional. Usado depois para calcular o vencimento do lote produzido."
								onValueChange={(prazoValidadeValor) => updateProductionRecipeOutput(index, { prazoValidadeValor })}
								onMeasureChange={(prazoValidadeMedida) => updateProductionRecipeOutput(index, { prazoValidadeMedida })}
								onMeasureReset={() => updateProductionRecipeOutput(index, { prazoValidadeMedida: null, prazoValidadeValor: null })}
							/>
						</div>
					</div>
				))}
				<Button
					type="button"
					variant="outline"
					className="w-full gap-2"
					onClick={() =>
						addProductionRecipeOutput({
							produtoId: "",
							produtoVarianteId: null,
							quantidade: 1,
							prazoValidadeMedida: null,
							prazoValidadeValor: null,
							produto: null,
							produtoVariante: null,
						})
					}
				>
					<CirclePlus className="h-4 w-4" />
					ADICIONAR SAÍDA
				</Button>
			</div>
		</ResponsiveMenuSection>
	);
}

function mapProductSelection(value: TSelectProductWithVariantsValue) {
	return {
		produtoId: value?.product.id ?? "",
		produtoVarianteId: value?.productVariant?.id ?? null,
		produto: value?.product
			? {
					id: value.product.id,
					nome: value.product.nome,
					codigo: value.product.codigo,
					imagemCapaUrl: value.product.imagemCapaUrl,
				}
			: null,
		produtoVariante: value?.productVariant
			? {
					id: value.productVariant.id,
					nome: value.productVariant.nome,
					codigo: value.productVariant.codigo,
					imagemCapaUrl: value.productVariant.imagemCapaUrl,
				}
			: null,
	};
}

function resolveProductLabel(item: { produto?: { nome: string } | null; produtoVariante?: { nome: string } | null }) {
	if (!item.produto?.nome) return undefined;
	if (item.produtoVariante?.nome) return `${item.produto.nome} - ${item.produtoVariante.nome}`;
	return item.produto.nome;
}
