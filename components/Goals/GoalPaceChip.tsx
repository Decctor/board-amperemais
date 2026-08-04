import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TGoalPacingSituation } from "@/lib/goals/pacing";
import { TrendingDown, TrendingUp, Target } from "lucide-react";

/**
 * Veredito de ritmo em uma linha: adiantado, no ritmo ou atrasado, com a diferença em reais.
 *
 * É a peça que aparece nas três superfícies (dashboard de metas, card da meta ativa e o bloco de
 * resultados gerais), então o vocabulário de cor mora aqui e não em cada tela.
 *
 * As cores saem da paleta fechada do DESIGN.md e reaproveitam a leitura já estabelecida nos
 * estados de atendimento: verde é desfecho positivo, azul é "em curso, sob controle" e o ouro é o
 * estado que **pede ação**. Vermelho fica de fora de propósito: estar atrás da meta no dia 8 não é
 * erro, é informação.
 */

const SITUATION_STYLES: Record<TGoalPacingSituation, { className: string; icon: typeof Target; rotulo: (diferenca: number) => string }> = {
	ADIANTADO: {
		className: "border-success/30 bg-success/10 text-success",
		icon: TrendingUp,
		rotulo: (diferenca) => `${formatToMoney(Math.abs(diferenca))} à frente`,
	},
	NO_RITMO: {
		className: "border-primary/25 bg-primary/10 text-primary",
		icon: Target,
		rotulo: () => "No ritmo",
	},
	ATRASADO: {
		className: "border-brand/40 bg-brand/15 text-foreground",
		icon: TrendingDown,
		rotulo: (diferenca) => `${formatToMoney(Math.abs(diferenca))} atrás`,
	},
};

type GoalPaceChipProps = {
	situacao: TGoalPacingSituation;
	diferenca: number;
	size?: "sm" | "md";
	className?: string;
};

export default function GoalPaceChip({ situacao, diferenca, size = "md", className }: GoalPaceChipProps) {
	const style = SITUATION_STYLES[situacao];
	const Icon = style.icon;

	return (
		<span
			className={cn(
				"inline-flex w-fit items-center gap-1.5 rounded-full border font-bold tabular-nums",
				size === "sm" ? "px-2 py-0.5 text-[0.65rem]" : "px-3 py-1 text-xs",
				style.className,
				className,
			)}
		>
			<Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
			{style.rotulo(diferenca)}
		</span>
	);
}
