import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCashbackProgramState } from "@/state-hooks/use-cashback-program-state";
import { Clock } from "lucide-react";

type CashbackProgramsExpirationBlockProps = {
	cashbackProgram: TUseCashbackProgramState["state"]["cashbackProgram"];
	updateCashbackProgram: TUseCashbackProgramState["updateCashbackProgram"];
};
export default function CashbackProgramsExpirationBlock({ cashbackProgram, updateCashbackProgram }: CashbackProgramsExpirationBlockProps) {
	return (
		<ResponsiveMenuSection title="EXPIRAÇÃO" icon={<Clock className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">Define abaixo, se aplicável, um valor em dias para que os pontos sejam expirados.</p>
				<NumberInput
					value={cashbackProgram.expiracaoRegraValidadeValor}
					label="VALOR DE VALIDADE P/ EXPIRAÇÃO"
					placeholder="Preencha aqui o valor de validade para a expiração..."
					handleChange={(value) => updateCashbackProgram({ expiracaoRegraValidadeValor: value })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
