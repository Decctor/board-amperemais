import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCashbackProgramState } from "@/state-hooks/use-cashback-program-state";
import { CashbackProgramRedemptionLimitTypeOptions } from "@/utils/select-options";
import { Shield } from "lucide-react";

type CashbackProgramsRedemptionLimitBlockProps = {
	cashbackProgram: TUseCashbackProgramState["state"]["cashbackProgram"];
	updateCashbackProgram: TUseCashbackProgramState["updateCashbackProgram"];
};
export default function CashbackProgramsRedemptionLimitBlock({
	cashbackProgram,
	updateCashbackProgram,
}: CashbackProgramsRedemptionLimitBlockProps) {
	return (
		<ResponsiveMenuSection title="LIMITE DE RESGATE" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">
					Define abaixo, se aplicável, um limite máximo de resgate por transação. Se FIXO, será o valor absoluto máximo. Se
					PERCENTUAL, será a porcentagem máxima do valor da compra.
				</p>
			</div>
			<div className="w-full flex items-center justify-center gap-2">
				<div className="w-full lg:w-1/2">
					<SelectInput
						value={cashbackProgram.resgateLimiteTipo}
						label="TIPO DE LIMITE"
						resetOptionLabel="SEM LIMITE"
						handleChange={(value) => updateCashbackProgram({ resgateLimiteTipo: value })}
						options={CashbackProgramRedemptionLimitTypeOptions}
						onReset={() => updateCashbackProgram({ resgateLimiteTipo: null, resgateLimiteValor: null })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						value={cashbackProgram.resgateLimiteValor ?? 0}
						label={cashbackProgram.resgateLimiteTipo === "PERCENTUAL" ? "LIMITE (%)" : "LIMITE (R$)"}
						placeholder={
							cashbackProgram.resgateLimiteTipo === "PERCENTUAL"
								? "Ex: 50 para 50% do valor da compra..."
								: "Ex: 100 para R$ 100,00..."
						}
						handleChange={(value) => updateCashbackProgram({ resgateLimiteValor: value })}
						width="100%"
						disabled={!cashbackProgram.resgateLimiteTipo}
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
