"use client";

import { appRoutes } from "@/lib/navigation/routes";
import { useProductsOverallStats } from "@/lib/queries/products";
import { Boxes } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

export function LowStockWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	// O período só alimenta as métricas de giro do endpoint; a saúde do estoque é um retrato atual.
	const input = useMemo(() => {
		const { before } = resolveTodayRange(dayKey);
		return { periodAfter: before.startOf("month").toDate(), periodBefore: before.toDate(), comparingPeriodAfter: null, comparingPeriodBefore: null };
	}, [dayKey]);
	const { data, isPending, isError, error } = useProductsOverallStats(input);
	const health = data?.stockHealth.current;
	const lowStock = health?.lowStock ?? 0;
	const outOfStock = health?.outOfStock ?? 0;
	const total = lowStock + outOfStock;

	return (
		<HubWidget href={appRoutes.inventory.root()} attention={outOfStock > 0}>
			<HubWidget.Header icon={<Boxes />} title="Estoque" hint="Reposição" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : total === 0 ? (
				<HubWidget.Empty message="Nenhum produto precisando de reposição." />
			) : (
				<>
					<HubWidget.Value label={total === 1 ? "produto precisa de reposição" : "produtos precisam de reposição"}>{total}</HubWidget.Value>
					<HubWidget.Details>
						{outOfStock > 0 ? <HubWidget.Detail label="Sem estoque" value={outOfStock} tone="destructive" /> : null}
						{lowStock > 0 ? <HubWidget.Detail label="Estoque baixo" value={lowStock} /> : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
