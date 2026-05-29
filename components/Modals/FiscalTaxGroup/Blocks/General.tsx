import CheckboxInput from "@/components/Inputs/CheckboxInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseFiscalTaxGroupState } from "@/state-hooks/use-fiscal-tax-group-state";
import { LayoutGrid } from "lucide-react";

type FiscalTaxGroupGeneralBlockProps = {
	fiscalTaxGroup: TUseFiscalTaxGroupState["state"]["fiscalTaxGroup"];
	updateFiscalTaxGroup: TUseFiscalTaxGroupState["updateFiscalTaxGroup"];
};
export default function FiscalTaxGroupGeneralBlock({ fiscalTaxGroup, updateFiscalTaxGroup }: FiscalTaxGroupGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={fiscalTaxGroup.ativo}
					labelTrue="GRUPO ATIVO"
					labelFalse="GRUPO INATIVO"
					handleChange={(value) => updateFiscalTaxGroup({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<TextInput
				value={fiscalTaxGroup.nome}
				label="NOME"
				placeholder="Ex.: REVENDA PADRÃO (CSOSN 102)"
				handleChange={(value) => updateFiscalTaxGroup({ nome: value })}
				width="100%"
			/>
			<TextareaInput
				value={fiscalTaxGroup.descricao ?? ""}
				label="DESCRIÇÃO"
				placeholder="Descreva a que tipo de produto este grupo se aplica..."
				handleChange={(value) => updateFiscalTaxGroup({ descricao: value })}
			/>
		</ResponsiveMenuSection>
	);
}
