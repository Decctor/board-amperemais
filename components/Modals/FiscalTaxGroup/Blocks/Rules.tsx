import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TFiscalClientTaxIndicatorEnum, TFiscalIcmsCsosnEnum, TFiscalOperationFinalityEnum, TFiscalTaxRuleScopeEnum } from "@/schemas/enums";
import type { TUseFiscalTaxGroupState } from "@/state-hooks/use-fiscal-tax-group-state";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { CSOSN_OPTIONS } from "./Icms";

const SCOPE_OPTIONS: { id: TFiscalTaxRuleScopeEnum; value: TFiscalTaxRuleScopeEnum; label: string }[] = [
	{ id: "INTRAESTADUAL", value: "INTRAESTADUAL", label: "INTRAESTADUAL" },
	{ id: "INTERESTADUAL", value: "INTERESTADUAL", label: "INTERESTADUAL" },
];

const INDICADOR_OPTIONS: { id: TFiscalClientTaxIndicatorEnum; value: TFiscalClientTaxIndicatorEnum; label: string }[] = [
	{ id: "CONTRIBUINTE_ICMS", value: "CONTRIBUINTE_ICMS", label: "CONTRIBUINTE DE ICMS" },
	{ id: "CONTRIBUINTE_ISENTO", value: "CONTRIBUINTE_ISENTO", label: "CONTRIBUINTE ISENTO" },
	{ id: "NAO_CONTRIBUINTE", value: "NAO_CONTRIBUINTE", label: "NÃO CONTRIBUINTE" },
];

const FINALITY_OPTIONS: { id: TFiscalOperationFinalityEnum; value: TFiscalOperationFinalityEnum; label: string }[] = [
	{ id: "NORMAL", value: "NORMAL", label: "NORMAL" },
	{ id: "COMPLEMENTAR", value: "COMPLEMENTAR", label: "COMPLEMENTAR" },
	{ id: "AJUSTE", value: "AJUSTE", label: "AJUSTE" },
	{ id: "DEVOLUCAO", value: "DEVOLUCAO", label: "DEVOLUÇÃO" },
];

type FiscalTaxGroupRulesBlockProps = {
	regras: TUseFiscalTaxGroupState["state"]["regras"];
	addRegra: TUseFiscalTaxGroupState["addRegra"];
	updateRegra: TUseFiscalTaxGroupState["updateRegra"];
	removeRegra: TUseFiscalTaxGroupState["removeRegra"];
};
export default function FiscalTaxGroupRulesBlock({ regras, addRegra, updateRegra, removeRegra }: FiscalTaxGroupRulesBlockProps) {
	return (
		<ResponsiveMenuSection title="REGRAS POR CENÁRIO" icon={<SlidersHorizontal className="h-4 min-h-4 w-4 min-w-4" />}>
			<p className="text-xs font-medium text-muted-foreground">
				Exceções aos defaults do grupo conforme o cenário. Campos vazios significam "qualquer". A regra mais específica vence.
			</p>

			{regras.map((regra, index) => {
				if (regra.deletar) return null;
				return (
					<div key={regra.id ?? `nova-${index}`} className="w-full flex flex-col gap-2 rounded-lg border border-primary/10 p-3">
						<div className="w-full flex items-center justify-between">
							<h3 className="text-xs font-bold uppercase tracking-tight text-primary/80">REGRA {index + 1}</h3>
							<Button variant="ghost" size="fit" className="p-1 text-red-500" onClick={() => removeRegra({ index })}>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>

						<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="ESCOPO"
									value={regra.escopo}
									options={SCOPE_OPTIONS}
									resetOptionLabel="SELECIONE O ESCOPO"
									handleChange={(value) => updateRegra({ index, regra: { escopo: value as TFiscalTaxRuleScopeEnum } })}
									onReset={() => updateRegra({ index, regra: { escopo: "INTRAESTADUAL" } })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<TextInput
									label="UF DE DESTINO (OPCIONAL)"
									value={regra.ufDestino ?? ""}
									placeholder="Ex.: MG"
									handleChange={(value) => updateRegra({ index, regra: { ufDestino: value ? value.toUpperCase() : null } })}
									width="100%"
								/>
							</div>
						</div>

						<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="DESTINATÁRIO (OPCIONAL)"
									value={regra.indicadorDestinatario ?? null}
									options={INDICADOR_OPTIONS}
									resetOptionLabel="QUALQUER"
									handleChange={(value) => updateRegra({ index, regra: { indicadorDestinatario: value as TFiscalClientTaxIndicatorEnum } })}
									onReset={() => updateRegra({ index, regra: { indicadorDestinatario: null } })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="FINALIDADE (OPCIONAL)"
									value={regra.finalidade ?? null}
									options={FINALITY_OPTIONS}
									resetOptionLabel="QUALQUER"
									handleChange={(value) => updateRegra({ index, regra: { finalidade: value as TFiscalOperationFinalityEnum } })}
									onReset={() => updateRegra({ index, regra: { finalidade: null } })}
									width="100%"
								/>
							</div>
						</div>

						<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
							<div className="w-full lg:w-1/2">
								<SelectInput
									label="CSOSN (OPCIONAL)"
									value={regra.csosn ?? null}
									options={CSOSN_OPTIONS}
									resetOptionLabel="HERDAR DO GRUPO"
									handleChange={(value) => updateRegra({ index, regra: { csosn: value as TFiscalIcmsCsosnEnum } })}
									onReset={() => updateRegra({ index, regra: { csosn: null } })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<TextInput
									label="CFOP (OPCIONAL)"
									value={regra.cfop ?? ""}
									placeholder="Ex.: 6108"
									handleChange={(value) => updateRegra({ index, regra: { cfop: value || null } })}
									width="100%"
								/>
							</div>
						</div>

						<NumberInput
							label="ALÍQUOTA DE ICMS (OPCIONAL)"
							value={regra.aliquotaIcms}
							placeholder="Herdar do grupo se vazio"
							handleChange={(value) => updateRegra({ index, regra: { aliquotaIcms: value } })}
							width="100%"
						/>
					</div>
				);
			})}

			<div className="w-full flex items-center justify-center">
				<Button
					variant="ghost"
					size="fit"
					className="flex items-center gap-1 px-2 py-1 text-xs"
					onClick={() => addRegra({ escopo: "INTERESTADUAL", ufDestino: null, indicadorDestinatario: null, finalidade: null, csosn: null, cfop: null, aliquotaIcms: null, percentualReducaoBc: null, percentualCreditoSn: null, temSubstituicaoTributaria: null, mvaSt: null, aliquotaIcmsSt: null, aliquotaInternaDestino: null, percentualReducaoBcSt: null, ativo: true })}
				>
					<Plus className="h-3.5 w-3.5" />
					ADICIONAR REGRA
				</Button>
			</div>
		</ResponsiveMenuSection>
	);
}
