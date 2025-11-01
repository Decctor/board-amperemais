"use client";
import StatsPeriodComparisonMenu from "@/components/Modals/Stats/StatsPeriodComparisonMenu";
import GroupedStatsBlock from "@/components/SalesStats/Blocks/GroupedStatsBlock";
import OverallStatsBlock from "@/components/SalesStats/Blocks/OverallStatsBlock";
import SalesGraphBlock from "@/components/SalesStats/Blocks/SalesGraphBlock";
import SalesQueryParamsMenu from "@/components/SalesStats/SalesQueryParamsMenu";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale } from "@/lib/formatting";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import dayjs from "dayjs";
import { GitCompare, ListFilter, X } from "lucide-react";
import { useMemo, useState } from "react";

const initialPeriodStart = dayjs().startOf("month").toISOString();
const initialPeriodEnd = dayjs().endOf("day").toISOString();
type DashboardPageProps = {
	user: TUserSession;
};
export function DashboardPage({ user }: DashboardPageProps) {
	const initialSellers = user.visualizacao === "GERAL" ? [] : [user.vendedor];

	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const [comparisonMenuIsOpen, setComparisonMenuIsOpen] = useState(false);

	const [generalQueryParams, setGeneralQueryParams] = useState<TSaleStatsGeneralQueryParams>({
		period: {
			after: initialPeriodStart,
			before: initialPeriodEnd,
		},
		total: {},
		saleNatures: [],
		sellers: initialSellers,
		clientRFMTitles: [],
		productGroups: [],
		excludedSalesIds: [],
	});
	function updateGeneralQueryParams(newParams: Partial<TSaleStatsGeneralQueryParams>) {
		setGeneralQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button variant="secondary" type="button" onClick={() => setComparisonMenuIsOpen(true)} className="flex items-center gap-2" size="sm">
					<GitCompare className="w-4 h-4 min-w-4 min-h-4" />
					COMPARAR PERÍODOS
				</Button>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>
			<DashboardPageFiltersShowcase queryParams={generalQueryParams} updateQueryParams={updateGeneralQueryParams} />
			<OverallStatsBlock generalQueryParams={generalQueryParams} user={user} />
			<SalesGraphBlock generalQueryParams={generalQueryParams} user={user} />
			<GroupedStatsBlock generalQueryParams={generalQueryParams} user={user} />
			{filterMenuIsOpen ? (
				<SalesQueryParamsMenu
					user={user}
					queryParams={generalQueryParams}
					updateQueryParams={updateGeneralQueryParams}
					closeMenu={() => setFilterMenuIsOpen(false)}
				/>
			) : null}
			{comparisonMenuIsOpen ? <StatsPeriodComparisonMenu closeMenu={() => setComparisonMenuIsOpen(false)} /> : null}
		</div>
	);
}

type DashboardPageFiltersShowcaseProps = {
	queryParams: TSaleStatsGeneralQueryParams;
	updateQueryParams: (params: Partial<TSaleStatsGeneralQueryParams>) => void;
};
function DashboardPageFiltersShowcase({ queryParams, updateQueryParams }: DashboardPageFiltersShowcaseProps) {
	function FilterTag({ label, value, onRemove }: { label: string; value: string; onRemove?: () => void }) {
		return (
			<div className="flex items-center gap-1 bg-secondary text-[0.65rem] rounded-lg px-2 py-1">
				<p className="text-primary/80">
					{label}: <strong>{value}</strong>
				</p>
				{onRemove && (
					<button type="button" onClick={onRemove} className="bg-transparent text-primary hover:bg-primary/20 rounded-lg p-1">
						<X size={12} />
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
			{queryParams.period.after && queryParams.period.before ? (
				<FilterTag label="PERÍODO" value={`${formatDateAsLocale(queryParams.period.after)} a ${formatDateAsLocale(queryParams.period.before)}`} />
			) : null}
			{queryParams.total.min || queryParams.total.max ? (
				<FilterTag
					label="VALOR"
					value={`${queryParams.total.min ? `MIN: R$ ${queryParams.total.min}` : "N/A"} - ${queryParams.total.max ? `MAX: R$ ${queryParams.total.max}` : "N/A"}`}
					onRemove={() => updateQueryParams({ total: { min: null, max: null } })}
				/>
			) : null}
			{queryParams.saleNatures.length > 0 ? (
				<FilterTag
					label="NATUREZA DA VENDA"
					value={queryParams.saleNatures.map((nature) => nature).join(", ")}
					onRemove={() => updateQueryParams({ saleNatures: [] })}
				/>
			) : null}
			{queryParams.clientRFMTitles.length > 0 ? (
				<FilterTag
					label="CATEGORIA DE CLIENTES"
					value={queryParams.clientRFMTitles.map((title) => title).join(", ")}
					onRemove={() => updateQueryParams({ clientRFMTitles: [] })}
				/>
			) : null}
			{queryParams.productGroups.length > 0 ? (
				<FilterTag
					label="GRUPO DE PRODUTOS"
					value={queryParams.productGroups.map((group) => group).join(", ")}
					onRemove={() => updateQueryParams({ productGroups: [] })}
				/>
			) : null}
			{queryParams.excludedSalesIds.length > 0 ? (
				<FilterTag
					label="VENDAS EXCLUÍDAS"
					value={queryParams.excludedSalesIds.map((id) => id).join(", ")}
					onRemove={() => updateQueryParams({ excludedSalesIds: [] })}
				/>
			) : null}
			{queryParams.sellers.length > 0 ? (
				<FilterTag
					label="VENDEDORES"
					value={queryParams.sellers.map((seller) => seller).join(", ")}
					onRemove={() => updateQueryParams({ sellers: [] })}
				/>
			) : null}
		</div>
	);
}
