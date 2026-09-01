"use client";

import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import { AddOnOptionTable } from "@/components/Modals/Products/Blocks/AddOns";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import type { TUseProductAddOnState } from "@/state-hooks/use-product-state";
import { Layers, ListPlus } from "lucide-react";
import { useMemo } from "react";

const ADDON_OPTION_GRID_COL_COUNT = 6;

type AddOnGroupFormProps = {
	state: TUseProductAddOnState["state"];
	updateAddOn: TUseProductAddOnState["updateAddOn"];
	addOption: TUseProductAddOnState["addOption"];
	updateOption: TUseProductAddOnState["updateOption"];
	removeOption: TUseProductAddOnState["removeOption"];
};

export default function AddOnGroupForm({ state, updateAddOn, addOption, updateOption, removeOption }: AddOnGroupFormProps) {
	const validOptions = useMemo(
		() => state.opcoes.map((option, index) => ({ ...option, originalIndex: index })).filter((option) => !option.deletar),
		[state.opcoes],
	);

	const gridBounds: SpreadsheetGridBounds = useMemo(
		() => ({
			rowCount: validOptions.length + 1,
			colCount: ADDON_OPTION_GRID_COL_COUNT,
		}),
		[validOptions.length],
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<ResponsiveMenuSection title="GERAL" icon={<Layers className="h-4 min-h-4 w-4 min-w-4" />}>
				<div className="flex w-full flex-col gap-2">
					<div className="flex w-full flex-col gap-2 lg:flex-row">
						<div className="w-full lg:w-1/2">
							<TextInput
								label="NOME (CLIENTE)"
								placeholder="Ex: Ponto da Carne, Borda, Extras..."
								value={state.nome}
								handleChange={(nome) => updateAddOn({ nome })}
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<TextInput
								label="NOME INTERNO"
								placeholder="Ex: Extras de Lanche, Extras de Pizza..."
								value={state.internoNome ?? ""}
								handleChange={(internoNome) => updateAddOn({ internoNome })}
							/>
						</div>
					</div>
					<div className="flex w-full flex-col gap-2 lg:flex-row">
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÍNIMO DE OPÇÕES"
								placeholder="0 = opcional"
								value={state.minOpcoes}
								handleChange={(minOpcoes) => updateAddOn({ minOpcoes: Math.max(0, Math.round(minOpcoes)) })}
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÁXIMO DE OPÇÕES"
								placeholder="1 = escolha única"
								value={state.maxOpcoes}
								handleChange={(maxOpcoes) => updateAddOn({ maxOpcoes: Math.max(1, Math.round(maxOpcoes)) })}
							/>
						</div>
					</div>
					<CheckboxInput
						labelTrue="GRUPO ATIVO"
						labelFalse="GRUPO INATIVO"
						checked={state.ativo}
						handleChange={(ativo) => updateAddOn({ ativo })}
					/>
				</div>
			</ResponsiveMenuSection>
			<ResponsiveMenuSection title="OPÇÕES" icon={<ListPlus className="h-4 min-h-4 w-4 min-w-4" />}>
				<div className="w-full overflow-hidden rounded-lg border border-border">
					<AddOnOptionTable
						validOptions={validOptions}
						gridBounds={gridBounds}
						addOption={addOption}
						updateOption={updateOption}
						removeOption={removeOption}
					/>
				</div>
			</ResponsiveMenuSection>
		</div>
	);
}
