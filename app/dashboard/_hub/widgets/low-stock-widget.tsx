"use client";

import { formatDecimalPlaces } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useProductsStock } from "@/lib/queries/products";
import { Boxes } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const LIST_LIMIT = 5;

export function LowStockWidget(_props: TDashboardWidgetProps) {
	// Sem estoque primeiro, depois os mais baixos: a ordem já é a ordem de reposição.
	const { data, isPending, isError, error } = useProductsStock({
		initialFilters: { stockStatus: ["out", "low"], orderByField: "quantidade", orderByDirection: "asc" },
	});
	const products = data?.products ?? [];
	const total = data?.productsMatched ?? 0;
	const outOfStock = data?.resumo.produtosSemEstoque ?? 0;

	return (
		<HubWidget attention={outOfStock > 0}>
			<HubWidget.Header icon={<Boxes />} title="Estoque" hint={total > 0 ? `${total} para repor` : undefined} href={appRoutes.inventory.root()} />
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : total === 0 ? (
				<HubWidget.Empty message="Nenhum produto precisando de reposição." />
			) : (
				<>
					<HubWidget.List>
						{products.slice(0, LIST_LIMIT).map((product) => {
							const quantity = product.quantidade ?? 0;
							return (
								<HubWidget.Item
									key={product.id}
									href={appRoutes.catalog.product(product.id)}
									primary={product.nome}
									secondary={[product.codigo, product.grupo].filter(Boolean).join(" · ")}
									trailing={quantity <= 0 ? "sem estoque" : `${formatDecimalPlaces(quantity)} ${product.unidade ?? "un"}`}
									tone={quantity <= 0 ? "destructive" : "default"}
								/>
							);
						})}
					</HubWidget.List>
					{data?.resumo.lotesVencendo7Dias ? (
						<HubWidget.Details>
							<HubWidget.Detail label="Lotes vencendo em 7 dias" value={data.resumo.lotesVencendo7Dias} tone="destructive" />
						</HubWidget.Details>
					) : null}
				</>
			)}
		</HubWidget>
	);
}
