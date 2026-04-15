"use client";
import StatsPeriodComparisonMenu from "@/components/Modals/Stats/StatsPeriodComparisonMenu";
import GroupedStatsBlock from "@/components/SalesStats/Blocks/GroupedStatsBlock";
import OverallStatsBlock from "@/components/SalesStats/Blocks/OverallStatsBlock";
import SalesGraphBlock from "@/components/SalesStats/Blocks/SalesGraphBlock";
import SalesQueryParamsMenu from "@/components/SalesStats/SalesQueryParamsMenu";
import { FiltersShowcase } from "@/components/ui/filters-showcase";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatDateAsLocale } from "@/lib/formatting";
import { useUsers } from "@/lib/queries/users";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import dayjs from "dayjs";
import { GitCompare, ListFilter } from "lucide-react";
import { useState } from "react";

const initialPeriodStart = dayjs().startOf("month").toISOString();
const initialPeriodEnd = dayjs().endOf("day").toISOString();

function createDefaultDashboardGeneralQueryParams(initialSellers: string[]): TSaleStatsGeneralQueryParams {
	return {
		period: {
			after: initialPeriodStart,
			before: initialPeriodEnd,
		},
		total: {},
		saleNatures: ["SN01"],
		sellers: initialSellers,
		clientRFMTitles: [],
		productGroups: [],
		excludedSalesIds: [],
	};
}

function areStringArraysEqual(left: string[] = [], right: string[] = []) {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function areTotalFiltersEqual(
	left: Partial<TSaleStatsGeneralQueryParams["total"]> | undefined,
	right: Partial<TSaleStatsGeneralQueryParams["total"]> | undefined,
) {
	return (left?.min ?? null) === (right?.min ?? null) && (left?.max ?? null) === (right?.max ?? null);
}

type DashboardPageProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export function DashboardPage({ user, userOrg, membership }: DashboardPageProps) {
	const initialSellers = membership.permissoes.resultados.escopo ? membership.permissoes.resultados.escopo : [];
	const defaultGeneralQueryParams = createDefaultDashboardGeneralQueryParams(initialSellers);

	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const [comparisonMenuIsOpen, setComparisonMenuIsOpen] = useState(false);

	const [generalQueryParams, setGeneralQueryParams] = useState<TSaleStatsGeneralQueryParams>(defaultGeneralQueryParams);
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
			<DashboardPageFiltersShowcase
				defaultQueryParams={defaultGeneralQueryParams}
				queryParams={generalQueryParams}
				updateQueryParams={updateGeneralQueryParams}
			/>
			<OverallStatsBlock generalQueryParams={generalQueryParams} user={user} userMembership={membership} userOrg={userOrg} />
			<SalesGraphBlock generalQueryParams={generalQueryParams} user={user} />
			<GroupedStatsBlock generalQueryParams={generalQueryParams} user={user} userOrg={userOrg} />
			{filterMenuIsOpen ? (
				<SalesQueryParamsMenu
					user={user}
					membership={membership}
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
	defaultQueryParams: TSaleStatsGeneralQueryParams;
	queryParams: TSaleStatsGeneralQueryParams;
	updateQueryParams: (params: Partial<TSaleStatsGeneralQueryParams>) => void;
};
function DashboardPageFiltersShowcase({ defaultQueryParams, queryParams, updateQueryParams }: DashboardPageFiltersShowcaseProps) {
	const { data: users } = useUsers({ initialFilters: {} });

	const enabledRemovals = {
		total: !areTotalFiltersEqual(defaultQueryParams.total, queryParams.total),
		saleNatures: !areStringArraysEqual(defaultQueryParams.saleNatures, queryParams.saleNatures),
		clientRFMTitles: !areStringArraysEqual(defaultQueryParams.clientRFMTitles, queryParams.clientRFMTitles),
		productGroups: !areStringArraysEqual(defaultQueryParams.productGroups, queryParams.productGroups),
		excludedSalesIds: !areStringArraysEqual(defaultQueryParams.excludedSalesIds, queryParams.excludedSalesIds),
		sellers: !areStringArraysEqual(defaultQueryParams.sellers, queryParams.sellers),
	};
	return (
		<FiltersShowcase.Root>
			{queryParams.period.after && queryParams.period.before ? (
				<FiltersShowcase.Item
					label="PERÍODO"
					value={`${formatDateAsLocale(queryParams.period.after)} a ${formatDateAsLocale(queryParams.period.before)}`}
				/>
			) : null}
			{queryParams.total.min || queryParams.total.max ? (
				<FiltersShowcase.Item
					label="VALOR"
					value={`${queryParams.total.min ? `MIN: R$ ${queryParams.total.min}` : "N/A"} - ${queryParams.total.max ? `MAX: R$ ${queryParams.total.max}` : "N/A"}`}
					onRemove={enabledRemovals.total ? () => updateQueryParams({ total: defaultQueryParams.total }) : undefined}
				/>
			) : null}
			{queryParams.saleNatures.length > 0 ? (
				<FiltersShowcase.Item
					label="NATUREZA DA VENDA"
					value={queryParams.saleNatures.map((nature) => nature).join(", ")}
					onRemove={enabledRemovals.saleNatures ? () => updateQueryParams({ saleNatures: defaultQueryParams.saleNatures }) : undefined}
				/>
			) : null}
			{queryParams.clientRFMTitles.length > 0 ? (
				<FiltersShowcase.Item
					label="CATEGORIA DE CLIENTES"
					value={queryParams.clientRFMTitles.map((title) => title).join(", ")}
					onRemove={enabledRemovals.clientRFMTitles ? () => updateQueryParams({ clientRFMTitles: defaultQueryParams.clientRFMTitles }) : undefined}
				/>
			) : null}
			{queryParams.productGroups.length > 0 ? (
				<FiltersShowcase.Item
					label="GRUPO DE PRODUTOS"
					value={queryParams.productGroups.map((group) => group).join(", ")}
					onRemove={enabledRemovals.productGroups ? () => updateQueryParams({ productGroups: defaultQueryParams.productGroups }) : undefined}
				/>
			) : null}
			{queryParams.excludedSalesIds.length > 0 ? (
				<FiltersShowcase.Item
					label="VENDAS EXCLUÍDAS"
					value={queryParams.excludedSalesIds.map((id) => id).join(", ")}
					onRemove={enabledRemovals.excludedSalesIds ? () => updateQueryParams({ excludedSalesIds: defaultQueryParams.excludedSalesIds }) : undefined}
				/>
			) : null}
			{queryParams.sellers.length > 0 ? (
				<FiltersShowcase.Item
					label="VENDEDORES"
					value={queryParams.sellers.map((seller) => users?.find((user) => user.id === seller)?.nome || seller).join(", ")}
					onRemove={enabledRemovals.sellers ? () => updateQueryParams({ sellers: defaultQueryParams.sellers }) : undefined}
				/>
			) : null}
		</FiltersShowcase.Root>
	);
}
