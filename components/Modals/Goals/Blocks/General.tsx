import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseGoalsState } from "@/state-hooks/use-goal-state";
import { LayoutGrid } from "lucide-react";
import PeriodPresets from "./PeriodPresets";

/**
 * Período e objetivos da meta.
 *
 * A conciliação com a soma dos vendedores **não** mora mais aqui. Antes existiam duas correções
 * opostas para a mesma divergência — uma que puxava o objetivo geral para a soma dos vendedores e
 * outra, na outra aba, que empurrava o objetivo geral para cima deles — e o usuário precisava
 * adivinhar qual das duas queria. Agora as duas ficam na tabela de vendedores, lado a lado e
 * nomeadas pelo que fazem.
 */

type OverlappingGoal = { id: string; dataInicio: Date | string; dataFim: Date | string };

type GoalGeneralProps = {
	goal: TUseGoalsState["state"]["goal"];
	updateGoal: TUseGoalsState["updateGoal"];
	overlappingGoals: OverlappingGoal[];
};

function GoalGeneral({ goal, updateGoal, overlappingGoals }: GoalGeneralProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<PeriodPresets
				range={{ dataInicio: goal.dataInicio, dataFim: goal.dataFim }}
				updateRange={(range) => updateGoal({ dataInicio: range.dataInicio, dataFim: range.dataFim })}
				overlappingGoals={overlappingGoals}
			/>

			<NumberInput
				label="META DE VALOR (R$)"
				placeholder="Preencha aqui o valor da meta..."
				value={goal.objetivoValor}
				handleChange={(value) => updateGoal({ objetivoValor: value })}
			/>

			<div className="flex w-full flex-col gap-3 border-t border-border pt-3">
				<p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Métricas adicionais (opcional)</p>
				<NumberInput
					label="META DE QUANTIDADE DE VENDAS"
					placeholder="Ex: 150 vendas no período..."
					value={goal.objetivoQtdeVendas ?? undefined}
					handleChange={(value) => updateGoal({ objetivoQtdeVendas: value || null })}
				/>
				<NumberInput
					label="META DE NOVOS CLIENTES"
					placeholder="Ex: 30 novos clientes no período..."
					value={goal.objetivoNovosClientes ?? undefined}
					handleChange={(value) => updateGoal({ objetivoNovosClientes: value || null })}
				/>
			</div>
		</ResponsiveMenuSection>
	);
}

export default GoalGeneral;
