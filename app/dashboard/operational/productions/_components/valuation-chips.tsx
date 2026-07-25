"use client";

import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

type ValuationTotals = {
	totalCost: number;
	expectedReturn: number;
	margin: number;
	marginPercentage: number | null;
	costIsComplete: boolean;
	returnIsComplete: boolean;
};

/**
 * Campos que só a valoração de produção carrega. Ausentes (receitas) significam valoração pelo
 * catálogo vigente — o correto para um molde.
 */
type ProductionValuationSnapshot = {
	isSnapshot: boolean;
	snapshotDate: string | Date | null;
};

type ValuationChipsProps = {
	valuation: ValuationTotals & Partial<ProductionValuationSnapshot>;
};

/**
 * Pills de custo, retorno esperado e margem — mesma geometria da linha de metadados dos cards; o que
 * varia é a cor da margem e o tracejado, que marca produções ainda não concluídas (valores projetados).
 */
export function ValuationChips({ valuation }: ValuationChipsProps) {
	// Receita não carrega `isSnapshot`; produção sempre carrega, e `false` significa ainda não concluída.
	const isProjection = valuation.isSnapshot === false;
	const marginIsNegative = valuation.margin < 0;
	const originHint = buildOriginHint(valuation);

	return (
		<>
			<ValuationChip
				variant="muted"
				isProjection={isProjection}
				icon={valuation.costIsComplete ? <Coins /> : <AlertTriangle />}
				label={`CUSTO: ${formatToMoney(valuation.totalCost)}`}
				tooltip={
					valuation.costIsComplete
						? `Custo dos insumos. ${originHint}`
						: `Custo dos insumos, subestimado: há insumo sem preço de custo cadastrado. ${originHint}`
				}
			/>
			<ValuationChip
				variant="muted"
				isProjection={isProjection}
				icon={valuation.returnIsComplete ? <TrendingUp /> : <AlertTriangle />}
				label={`RETORNO: ${formatToMoney(valuation.expectedReturn)}`}
				tooltip={
					valuation.returnIsComplete
						? `Retorno esperado das saídas. ${originHint}`
						: `Retorno esperado das saídas, subestimado: há saída sem preço de venda cadastrado. ${originHint}`
				}
			/>
			<ValuationChip
				variant={marginIsNegative ? "destructive" : "success"}
				isProjection={isProjection}
				icon={marginIsNegative ? <TrendingDown /> : <TrendingUp />}
				label={`MARGEM: ${formatToMoney(valuation.margin)}${
					valuation.marginPercentage !== null ? ` (${formatDecimalPlaces(valuation.marginPercentage, 0, 1)}%)` : ""
				}`}
				tooltip={`Retorno esperado menos custo dos insumos. ${originHint}`}
			/>
		</>
	);
}

function buildOriginHint(valuation: ValuationChipsProps["valuation"]) {
	if (valuation.isSnapshot === undefined) return "Calculado com os preços atuais do catálogo.";
	if (!valuation.isSnapshot) return "Estimativa pelos preços atuais do catálogo — a valoração definitiva é congelada na conclusão da produção.";

	const snapshotDate = formatDateAsLocale(valuation.snapshotDate, true);
	return snapshotDate ? `Valores congelados na conclusão, em ${snapshotDate}.` : "Valores congelados na conclusão da produção.";
}

function ValuationChip({
	variant,
	icon,
	label,
	tooltip,
	isProjection,
}: {
	variant: "muted" | "success" | "destructive";
	icon: ReactNode;
	label: string;
	tooltip: string;
	isProjection: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Chip.Root variant={variant} size="xs" shape="pill" className={cn("cursor-default", isProjection && "border-dashed border-current/40")}>
					<Chip.Icon>{icon}</Chip.Icon>
					<Chip.Label caps weight="bold">
						{label}
					</Chip.Label>
				</Chip.Root>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
