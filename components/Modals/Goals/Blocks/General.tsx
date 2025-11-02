import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TUseGoalsState } from "@/hooks/use-goal-state";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { LayoutGrid } from "lucide-react";

type GoalGeneralProps = {
	goal: TUseGoalsState["state"]["goal"];
	updateGoal: TUseGoalsState["updateGoal"];
	goalSellers: TUseGoalsState["state"]["goalSellers"];
};
function GoalGeneral({ goal, updateGoal, goalSellers }: GoalGeneralProps) {
	const goalSellersTotalValue = goalSellers.reduce((acc, goalSeller) => acc + goalSeller.objetivoValor, 0);
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERIAS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<DateInput
				label="DATA DE INÍCIO"
				value={formatDateForInputValue(goal.dataInicio)}
				handleChange={(value) => updateGoal({ dataInicio: formatDateOnInputChange(value, "date", "start") ?? undefined })}
				width="100%"
			/>
			<DateInput
				label="DATA DE FIM"
				value={formatDateForInputValue(goal.dataFim)}
				handleChange={(value) => updateGoal({ dataFim: formatDateOnInputChange(value, "date", "end") ?? undefined })}
				width="100%"
			/>
			<NumberInput
				label="VALOR"
				placeholder="Preencha aqui o valor da meta..."
				value={goal.objetivoValor}
				handleChange={(value) => updateGoal({ objetivoValor: value })}
				width="100%"
			/>
			{Math.abs(goalSellersTotalValue - goal.objetivoValor) > 1 ? (
				<div className="w-full flex flex-col gap-1 border border-yellow-800 bg-yellow-100 text-yellow-800 p-2 rounded-md">
					<p className="text-xs font-medium text-center tracking-tight">O valor total das metas dos vendedores não corresponde ao valor da meta geral.</p>
					<div className="w-full flex items-center justify-center">
						<Button
							size="fit"
							variant="ghost"
							className="text-xs bg-transparent hover:bg-yellow-800 hover:text-yellow-100 px-2 py-0.5 transition-colors"
							onClick={() => updateGoal({ objetivoValor: goalSellersTotalValue })}
						>
							ATUALIZAR
						</Button>
					</div>
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}

export default GoalGeneral;
