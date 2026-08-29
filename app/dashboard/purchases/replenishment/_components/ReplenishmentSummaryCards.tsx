import type { TReplenishmentSummary } from "@/lib/replenishment";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { AlertOctagon, BadgeDollarSign, Layers, ShoppingCart, TrendingDown } from "lucide-react";

type ReplenishmentSummaryCardsProps = {
	resumo: TReplenishmentSummary | undefined;
};

// Quatro números que respondem, nesta ordem: o que comprar, quanto custa, o que se perde sem
// comprar, e quanto capital já está preso na prateleira errada.
export function ReplenishmentSummaryCards({ resumo }: ReplenishmentSummaryCardsProps) {
	return (
		<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<StatUnitCard
				title="Comprar agora"
				subtitle={
					resumo
						? `${formatDecimalPlaces(resumo.produtosEmRuptura)} em ruptura · ${formatDecimalPlaces(resumo.produtosCriticos)} críticos`
						: "Produtos no ponto de pedido"
				}
				icon={<ShoppingCart className="h-4 w-4 min-h-4 min-w-4" />}
				current={{ value: resumo?.produtosParaComprar ?? 0, format: (value) => `${formatDecimalPlaces(value)} produtos` }}
			/>
			<StatUnitCard
				title="Investimento sugerido"
				subtitle="Quantidade sugerida × custo de reposição"
				icon={<BadgeDollarSign className="h-4 w-4 min-h-4 min-w-4" />}
				current={{ value: resumo?.valorSugestaoTotal ?? 0, format: (value) => formatToMoney(value) }}
			/>
			<StatUnitCard
				title="Venda em risco"
				subtitle="Margem que se perde se nada for comprado"
				icon={<TrendingDown className="h-4 w-4 min-h-4 min-w-4" />}
				current={{ value: resumo?.perdaPotencialTotal ?? 0, format: (value) => formatToMoney(value) }}
			/>
			<StatUnitCard
				title="Capital em excesso"
				subtitle={
					resumo
						? `${formatDecimalPlaces(resumo.produtosEmExcesso)} em excesso · ${formatDecimalPlaces(resumo.produtosSemGiro)} sem giro`
						: "Estoque acima da cobertura alvo"
				}
				icon={<Layers className="h-4 w-4 min-h-4 min-w-4" />}
				current={{ value: resumo?.valorImobilizadoExcesso ?? 0, format: (value) => formatToMoney(value) }}
			/>
		</div>
	);
}

export function ReplenishmentSummaryAlert({ resumo }: ReplenishmentSummaryCardsProps) {
	if (!resumo || resumo.produtosEmRuptura === 0) return null;
	return (
		<div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
			<AlertOctagon className="h-4 w-4 min-h-4 min-w-4" />
			<span>
				{resumo.produtosEmRuptura === 1
					? "1 produto está zerado e continua sendo procurado."
					: `${formatDecimalPlaces(resumo.produtosEmRuptura)} produtos estão zerados e continuam sendo procurados.`}{" "}
				Cada dia parado é venda que não volta.
			</span>
		</div>
	);
}
