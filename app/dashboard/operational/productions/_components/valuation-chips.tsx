"use client";

import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

type ValuationTotals = {
	custoTotal: number;
	retornoEsperado: number;
	margem: number;
	margemPercentual: number | null;
	custoCompleto: boolean;
	retornoCompleto: boolean;
};

/**
 * Campos que só a valoração de produção carrega. Ausentes (receitas) significam valoração pelo
 * catálogo vigente — o correto para um molde.
 */
type ProductionValuationSnapshot = {
	ehSnapshot: boolean;
	dataSnapshotValores: string | Date | null;
};

type ValuationChipsProps = {
	valores: ValuationTotals & Partial<ProductionValuationSnapshot>;
};

/**
 * Pills de custo, retorno esperado e margem — mesma geometria da linha de metadados dos cards; o que
 * varia é a cor da margem e o tracejado, que marca produções ainda não concluídas (valores projetados).
 */
export function ValuationChips({ valores }: ValuationChipsProps) {
	// Receita não carrega `ehSnapshot`; produção sempre carrega, e `false` significa ainda não concluída.
	const isProjection = valores.ehSnapshot === false;
	const marginIsNegative = valores.margem < 0;
	const originHint = buildOriginHint(valores);

	return (
		<>
			<ValuationChip
				variant="muted"
				isProjection={isProjection}
				icon={valores.custoCompleto ? <Coins /> : <AlertTriangle />}
				label={`CUSTO: ${formatToMoney(valores.custoTotal)}`}
				tooltip={
					valores.custoCompleto
						? `Custo dos insumos. ${originHint}`
						: `Custo dos insumos, subestimado: há insumo sem preço de custo cadastrado. ${originHint}`
				}
			/>
			<ValuationChip
				variant="muted"
				isProjection={isProjection}
				icon={valores.retornoCompleto ? <TrendingUp /> : <AlertTriangle />}
				label={`RETORNO: ${formatToMoney(valores.retornoEsperado)}`}
				tooltip={
					valores.retornoCompleto
						? `Retorno esperado das saídas. ${originHint}`
						: `Retorno esperado das saídas, subestimado: há saída sem preço de venda cadastrado. ${originHint}`
				}
			/>
			<ValuationChip
				variant={marginIsNegative ? "destructive" : "success"}
				isProjection={isProjection}
				icon={marginIsNegative ? <TrendingDown /> : <TrendingUp />}
				label={`MARGEM: ${formatToMoney(valores.margem)}${
					valores.margemPercentual !== null ? ` (${formatDecimalPlaces(valores.margemPercentual, 0, 1)}%)` : ""
				}`}
				tooltip={`Retorno esperado menos custo dos insumos. ${originHint}`}
			/>
		</>
	);
}

function buildOriginHint(valores: ValuationChipsProps["valores"]) {
	if (valores.ehSnapshot === undefined) return "Calculado com os preços atuais do catálogo.";
	if (!valores.ehSnapshot) return "Estimativa pelos preços atuais do catálogo — a valoração definitiva é congelada na conclusão da produção.";

	const snapshotDate = formatDateAsLocale(valores.dataSnapshotValores, true);
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
