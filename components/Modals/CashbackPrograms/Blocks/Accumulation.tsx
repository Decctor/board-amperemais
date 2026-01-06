import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCashbackProgramState } from "@/state-hooks/use-cashback-program-state";
import { CashbackProgramAccumulationTypeOptions } from "@/utils/select-options";
import { LayoutGrid, PiggyBank } from "lucide-react";

type CashbackProgramsAccumulationBlockProps = {
	cashbackProgram: TUseCashbackProgramState["state"]["cashbackProgram"];
	updateCashbackProgram: TUseCashbackProgramState["updateCashbackProgram"];
};
export default function CashbackProgramsAccumulationBlock({ cashbackProgram, updateCashbackProgram }: CashbackProgramsAccumulationBlockProps) {
	return (
		<ResponsiveMenuSection title="ACUMULAÇÃO" icon={<PiggyBank className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center gap-2">
				<div className="w-full lg:w-1/2">
					<SelectInput
						value={cashbackProgram.acumuloTipo}
						label="TIPO DE ACUMULAÇÃO"
						resetOptionLabel="NÃO DEFINIDO"
						handleChange={(value) => updateCashbackProgram({ acumuloTipo: value })}
						options={CashbackProgramAccumulationTypeOptions}
						onReset={() => updateCashbackProgram({ acumuloTipo: "FIXO" })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						value={cashbackProgram.acumuloValor}
						label="VALOR DE ACUMULAÇÃO"
						placeholder="Preencha aqui o valor de acumulação..."
						handleChange={(value) => updateCashbackProgram({ acumuloValor: value })}
						width="100%"
					/>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">
					Define abaixo, se aplicável, um valor mínimo de compra para que o cliente acumule pontos.
				</p>
				<NumberInput
					value={cashbackProgram.acumuloRegraValorMinimo}
					label="VALOR MÍNIMO P/ ACÚMULO"
					placeholder="Preencha aqui o valor mínimo para o acúmulo..."
					handleChange={(value) => updateCashbackProgram({ acumuloRegraValorMinimo: value })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
