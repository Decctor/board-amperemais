"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { StatEmptyState } from "@/components/SalesStats/StatEmptyState";
import { getErrorMessage } from "@/lib/errors";
import { useSalesResults } from "@/lib/queries/sales-results";
import dayjs from "dayjs";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { parseAsArrayOf, parseAsIsoDateTime, parseAsString, useQueryStates } from "nuqs";
import { DeliveryModesBlock } from "./_components/delivery-modes-block";
import { FiscalHealthBlock } from "./_components/fiscal-health-block";
import { PaymentMethodsBlock } from "./_components/payment-methods-block";
import { ResultsFilters } from "./_components/results-filters";
import { SellersBlock } from "./_components/sellers-block";
import { SummaryBlock } from "./_components/summary-block";

type SalesResultsPageProps = {
	/** Membro com escopo de resultados enxerga só os próprios vendedores; o filtro some e o servidor aplica o escopo. */
	hasResultsScope: boolean;
	canViewSensitive: boolean;
};

// Período padrão: hoje. A pergunta que esta página responde primeiro é "como foi o dia".
const defaultAfter = dayjs().startOf("day").toDate();
const defaultBefore = dayjs().endOf("day").toDate();

export default function SalesResultsPage({ hasResultsScope, canViewSensitive }: SalesResultsPageProps) {
	const [params, setParams] = useQueryStates(
		{
			after: parseAsIsoDateTime.withDefault(defaultAfter),
			before: parseAsIsoDateTime.withDefault(defaultBefore),
			sellersIds: parseAsArrayOf(parseAsString).withDefault([]),
			channels: parseAsArrayOf(parseAsString).withDefault([]),
		},
		{ history: "replace" },
	);

	const { data, isLoading, isError, error } = useSalesResults(params);
	// Recorte do relatório levado para o histórico ao clicar num cartão. Canal não existe lá.
	const historyFilters = {
		periodAfter: params.after,
		periodBefore: params.before,
		sellersIds: params.sellersIds,
		saleStatuses: ["CONFIRMADA" as const],
	};

	const hasSales = (data?.resumo.qtdeVendas.atual ?? 0) > 0 || (data?.resumo.canceladas.qtde ?? 0) > 0;

	return (
		<div className="flex w-full flex-col gap-4 p-1">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col">
					<h1 className="font-black text-2xl tracking-tight">Resultados</h1>
					<p className="text-sm text-muted-foreground">
						Vendas, recebimentos por método, resultado por modalidade e por vendedor e emissão fiscal do período.
					</p>
				</div>
			</div>

			<ResultsFilters
				params={params}
				updateParams={(next) => setParams(next)}
				channelOptions={data?.filterOptions.canais ?? []}
				showSellersFilter={!hasResultsScope}
			/>

			{isLoading ? (
				<LoadingComponent />
			) : isError ? (
				<ErrorComponent msg={getErrorMessage(error)} />
			) : !data ? null : !hasSales ? (
				<StatEmptyState
					icon={ChartNoAxesColumnIncreasing}
					title="Nenhuma venda no período"
					description="Ajuste o período ou os filtros para ver os resultados."
				/>
			) : (
				<>
					<SummaryBlock resumo={data.resumo} canViewSensitive={canViewSensitive} />
					<div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
						<PaymentMethodsBlock porMetodo={data.porMetodo} faturamento={data.resumo.faturamento.atual ?? 0} historyFilters={historyFilters} />
						<FiscalHealthBlock fiscal={data.fiscal} qtdeVendas={data.resumo.qtdeVendas.atual ?? 0} />
					</div>
					<DeliveryModesBlock porModalidade={data.porModalidade} canViewSensitive={canViewSensitive} historyFilters={historyFilters} />
					<SellersBlock porVendedor={data.porVendedor} canViewSensitive={canViewSensitive} />
				</>
			)}
		</div>
	);
}
