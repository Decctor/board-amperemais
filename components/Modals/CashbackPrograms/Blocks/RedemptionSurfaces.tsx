import CheckboxInput from "@/components/Inputs/CheckboxInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getCashbackUnitLabel } from "@/lib/formatting";
import type { TUseCashbackProgramState } from "@/state-hooks/use-cashback-program-state";
import { MapPin } from "lucide-react";

type CashbackProgramsRedemptionSurfacesBlockProps = {
	cashbackProgram: TUseCashbackProgramState["state"]["cashbackProgram"];
	updateCashbackProgram: TUseCashbackProgramState["updateCashbackProgram"];
};
// Superfícies de resgate do programa (lib/cashback/redemption-policy): valem para desconto em
// cashback E recompensa. Ao menos uma precisa ficar ligada — validado no salvar e na rota.
export default function CashbackProgramsRedemptionSurfacesBlock({
	cashbackProgram,
	updateCashbackProgram,
}: CashbackProgramsRedemptionSurfacesBlockProps) {
	const unitLabel = getCashbackUnitLabel(cashbackProgram.terminologia);
	return (
		<ResponsiveMenuSection title="ONDE O CLIENTE PODE RESGATAR" icon={<MapPin className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">
					Define abaixo em quais superfícies o cliente pode resgatar {unitLabel} — como desconto ou como recompensa. Desligar uma superfície esconde o
					resgate nela; o acúmulo não é afetado. Ao menos uma precisa ficar ativa.
				</p>
			</div>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="PERMITIR RESGATES PELO PDV"
					labelFalse="PERMITIR RESGATES PELO PDV"
					checked={cashbackProgram.resgatePermitirViaPos}
					handleChange={(value) => updateCashbackProgram({ resgatePermitirViaPos: value })}
				/>
				<CheckboxInput
					labelTrue="PERMITIR RESGATES PELO PONTO DE INTERAÇÃO"
					labelFalse="PERMITIR RESGATES PELO PONTO DE INTERAÇÃO"
					checked={cashbackProgram.resgatePermitirViaPontoIntegracao}
					handleChange={(value) => updateCashbackProgram({ resgatePermitirViaPontoIntegracao: value })}
				/>
				<CheckboxInput
					labelTrue="PERMITIR RESGATES PELA LOJA DIGITAL"
					labelFalse="PERMITIR RESGATES PELA LOJA DIGITAL"
					checked={cashbackProgram.resgatePermitirViaLojaDigital}
					handleChange={(value) => updateCashbackProgram({ resgatePermitirViaLojaDigital: value })}
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
