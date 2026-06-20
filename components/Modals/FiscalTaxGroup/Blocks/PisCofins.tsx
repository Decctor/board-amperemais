import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TFiscalPisCofinsCstEnum } from "@/schemas/enums";
import type { TUseFiscalTaxGroupState } from "@/state-hooks/use-fiscal-tax-group-state";
import { Receipt } from "lucide-react";

export const PIS_COFINS_CST_OPTIONS: { id: TFiscalPisCofinsCstEnum; value: TFiscalPisCofinsCstEnum; label: string }[] = [
	{ id: "01", value: "01", label: "01 - Operação tributável (alíquota normal)" },
	{ id: "02", value: "02", label: "02 - Operação tributável (alíquota diferenciada)" },
	{ id: "03", value: "03", label: "03 - Operação tributável (por unidade)" },
	{ id: "04", value: "04", label: "04 - Monofásica (alíquota zero)" },
	{ id: "05", value: "05", label: "05 - Substituição tributária" },
	{ id: "06", value: "06", label: "06 - Alíquota zero" },
	{ id: "07", value: "07", label: "07 - Isenta da contribuição" },
	{ id: "08", value: "08", label: "08 - Sem incidência da contribuição" },
	{ id: "09", value: "09", label: "09 - Suspensão da contribuição" },
	{ id: "49", value: "49", label: "49 - Outras operações de saída" },
	{ id: "99", value: "99", label: "99 - Outras operações" },
];

type FiscalTaxGroupPisCofinsBlockProps = {
	fiscalTaxGroup: TUseFiscalTaxGroupState["state"]["fiscalTaxGroup"];
	updateFiscalTaxGroup: TUseFiscalTaxGroupState["updateFiscalTaxGroup"];
};
export default function FiscalTaxGroupPisCofinsBlock({ fiscalTaxGroup, updateFiscalTaxGroup }: FiscalTaxGroupPisCofinsBlockProps) {
	return (
		<ResponsiveMenuSection title="PIS / COFINS" icon={<Receipt className="h-4 min-h-4 w-4 min-w-4" />}>
			<p className="text-xs font-medium text-muted-foreground">No Simples Nacional, em regra usa-se CST 49 com valor zero (recolhimento no DAS).</p>
			<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="CST DO PIS"
						value={fiscalTaxGroup.cstPis}
						options={PIS_COFINS_CST_OPTIONS}
						resetOptionLabel="SELECIONE O CST"
						handleChange={(value) => updateFiscalTaxGroup({ cstPis: value as TFiscalPisCofinsCstEnum })}
						onReset={() => updateFiscalTaxGroup({ cstPis: "49" })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="ALÍQUOTA DE PIS (%)"
						value={fiscalTaxGroup.aliquotaPis}
						placeholder="Ex.: 0"
						handleChange={(value) => updateFiscalTaxGroup({ aliquotaPis: value })}
					/>
				</div>
			</div>
			<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="CST DA COFINS"
						value={fiscalTaxGroup.cstCofins}
						options={PIS_COFINS_CST_OPTIONS}
						resetOptionLabel="SELECIONE O CST"
						handleChange={(value) => updateFiscalTaxGroup({ cstCofins: value as TFiscalPisCofinsCstEnum })}
						onReset={() => updateFiscalTaxGroup({ cstCofins: "49" })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="ALÍQUOTA DE COFINS (%)"
						value={fiscalTaxGroup.aliquotaCofins}
						placeholder="Ex.: 0"
						handleChange={(value) => updateFiscalTaxGroup({ aliquotaCofins: value })}
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
