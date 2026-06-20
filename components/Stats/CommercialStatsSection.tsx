"use client";
import StatsPeriodComparisonMenu from "@/components/Modals/Stats/StatsPeriodComparisonMenu";
import GroupedStatsBlock from "@/components/SalesStats/Blocks/GroupedStatsBlock";
import OverallStatsBlock from "@/components/SalesStats/Blocks/OverallStatsBlock";
import SalesGraphBlock from "@/components/SalesStats/Blocks/SalesGraphBlock";
import MultipleSalesSelectInput from "@/components/Inputs/SelectMultipleSalesInput";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatInteractiveCountSummary, formatInteractiveDateRangeSummary, formatInteractiveNumberRangeSummary, formatInteractiveOptionSummary } from "@/components/ui/interactive-filter-formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import { RFMLabels } from "@/utils/rfm";
import dayjs from "dayjs";
import { BadgeDollarSign, Calendar, GitCompare, ListFilter } from "lucide-react";
import { useState } from "react";

const initialPeriodStart = dayjs().startOf("month").toISOString();
const initialPeriodEnd = dayjs().endOf("day").toISOString();

function createDefaultParams(initialSellers: string[]): TSaleStatsGeneralQueryParams {
	return {
		period: { after: initialPeriodStart, before: initialPeriodEnd },
		total: {},
		saleNatures: ["SN01"],
		sellers: initialSellers,
		clientRFMTitles: [],
		productGroups: [],
		excludedSalesIds: [],
	};
}

type CommercialStatsSectionProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export function CommercialStatsSection({ user, userOrg, membership }: CommercialStatsSectionProps) {
	const initialSellers = membership.permissoes.resultados.escopo ?? [];
	const [comparisonMenuIsOpen, setComparisonMenuIsOpen] = useState(false);
	const [generalQueryParams, setGeneralQueryParams] = useState<TSaleStatsGeneralQueryParams>(createDefaultParams(initialSellers));

	function updateGeneralQueryParams(newParams: Partial<TSaleStatsGeneralQueryParams>) {
		setGeneralQueryParams((prev) => ({ ...prev, ...newParams }));
	}

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button variant="secondary" type="button" onClick={() => setComparisonMenuIsOpen(true)} className="flex items-center gap-2" size="sm">
					<GitCompare className="w-4 h-4 min-w-4 min-h-4" />
					COMPARAR PERÍODOS
				</Button>
			</div>
			<CommercialInlineFilters membership={membership} queryParams={generalQueryParams} updateQueryParams={updateGeneralQueryParams} />
			<OverallStatsBlock generalQueryParams={generalQueryParams} user={user} userMembership={membership} userOrg={userOrg} />
			<SalesGraphBlock generalQueryParams={generalQueryParams} user={user} />
			<GroupedStatsBlock generalQueryParams={generalQueryParams} user={user} userOrg={userOrg} />
			{comparisonMenuIsOpen ? <StatsPeriodComparisonMenu closeMenu={() => setComparisonMenuIsOpen(false)} /> : null}
		</div>
	);
}

type CommercialInlineFiltersProps = {
	membership: NonNullable<TAuthUserSession["membership"]>;
	queryParams: TSaleStatsGeneralQueryParams;
	updateQueryParams: (params: Partial<TSaleStatsGeneralQueryParams>) => void;
};

function CommercialInlineFilters({ membership, queryParams, updateQueryParams }: CommercialInlineFiltersProps) {
	const { data: filterOptions } = useSaleQueryFilterOptions();
	const selectableSellersIds = membership.permissoes.resultados.escopo ?? null;
	const sellerOptions = ((selectableSellersIds ? filterOptions?.sellers.filter((s) => selectableSellersIds.includes(s.id)) : filterOptions?.sellers) ?? []) as InteractiveFilterOption<string>[];
	const productGroupOptions = (filterOptions?.productsGroups ?? []) as InteractiveFilterOption<string>[];
	const saleNatureOptions = (filterOptions?.saleNatures ?? []) as InteractiveFilterOption<string>[];
	const rfmOptions = RFMLabels.map((item, index) => ({ id: index + 1, label: item.text, value: item.text })) satisfies InteractiveFilterOption<string>[];

	const hasSellers = queryParams.sellers.length > 0;
	const hasSaleNatures = queryParams.saleNatures.length > 0;
	const hasProductGroups = queryParams.productGroups.length > 0;
	const hasRFM = queryParams.clientRFMTitles.length > 0;
	const hasTotal = queryParams.total.min != null || queryParams.total.max != null;
	const hasExcludedSales = queryParams.excludedSalesIds.length > 0;

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<Calendar className="h-4 w-4" />
						<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(queryParams.period.after, queryParams.period.before)}</InteractiveFilter.Value>
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-auto p-0">
					<InteractiveFilter.DateRangeContent
						value={{
							from: queryParams.period.after ? new Date(queryParams.period.after) : undefined,
							to: queryParams.period.before ? new Date(queryParams.period.before) : undefined,
						}}
						onChange={(period) =>
							updateQueryParams({
								period: {
									after: period.from?.toISOString() ?? queryParams.period.after,
									before: period.to?.toISOString() ?? queryParams.period.before,
								},
							})
						}
					/>
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasSellers ? <CommercialMultiFilter label="VENDEDORES" options={sellerOptions} value={queryParams.sellers} onChange={(sellers) => updateQueryParams({ sellers })} onClear={() => updateQueryParams({ sellers: [] })} /> : null}
			{hasSaleNatures ? (
				<CommercialMultiFilter
					label="NATUREZAS"
					options={saleNatureOptions}
					value={queryParams.saleNatures}
					onChange={(saleNatures) => updateQueryParams({ saleNatures: saleNatures as TSaleStatsGeneralQueryParams["saleNatures"] })}
					onClear={() => updateQueryParams({ saleNatures: [] })}
				/>
			) : null}
			{hasProductGroups ? <CommercialMultiFilter label="GRUPOS" options={productGroupOptions} value={queryParams.productGroups} onChange={(productGroups) => updateQueryParams({ productGroups })} onClear={() => updateQueryParams({ productGroups: [] })} /> : null}
			{hasRFM ? <CommercialMultiFilter label="RFM" options={rfmOptions} value={queryParams.clientRFMTitles} onChange={(clientRFMTitles) => updateQueryParams({ clientRFMTitles })} onClear={() => updateQueryParams({ clientRFMTitles: [] })} /> : null}
			{hasTotal ? <CommercialTotalFilter queryParams={queryParams} updateQueryParams={updateQueryParams} /> : null}
			{hasExcludedSales ? <CommercialExcludedSalesFilter queryParams={queryParams} updateQueryParams={updateQueryParams} /> : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
				</InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasSellers ? (
							<InteractiveFilter.AddFilterItem id="sellers" label="VENDEDORES" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent options={sellerOptions} value={queryParams.sellers} onChange={(sellers) => updateQueryParams({ sellers })} onClear={() => updateQueryParams({ sellers: [] })} clearLabel="TODOS" />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasSaleNatures ? (
							<InteractiveFilter.AddFilterItem id="saleNatures" label="NATUREZAS" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent options={saleNatureOptions} value={queryParams.saleNatures} onChange={(saleNatures) => updateQueryParams({ saleNatures: saleNatures as TSaleStatsGeneralQueryParams["saleNatures"] })} onClear={() => updateQueryParams({ saleNatures: [] })} clearLabel="TODAS" />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasProductGroups ? (
							<InteractiveFilter.AddFilterItem id="productGroups" label="GRUPOS" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent options={productGroupOptions} value={queryParams.productGroups} onChange={(productGroups) => updateQueryParams({ productGroups })} onClear={() => updateQueryParams({ productGroups: [] })} clearLabel="TODOS" />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasRFM ? (
							<InteractiveFilter.AddFilterItem id="rfm" label="RFM" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent options={rfmOptions} value={queryParams.clientRFMTitles} onChange={(clientRFMTitles) => updateQueryParams({ clientRFMTitles })} onClear={() => updateQueryParams({ clientRFMTitles: [] })} clearLabel="TODOS" />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasTotal ? (
							<InteractiveFilter.AddFilterItem id="total" label="VALOR" icon={<BadgeDollarSign className="h-4 w-4" />}>
								<InteractiveFilter.NumberRangeContent
									value={{ greaterThan: queryParams.total.min, lessThan: queryParams.total.max }}
									onChange={({ greaterThan, lessThan }) => updateQueryParams({ total: { min: greaterThan ?? undefined, max: lessThan ?? undefined } })}
									onClear={() => updateQueryParams({ total: {} })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasExcludedSales ? (
							<InteractiveFilter.AddFilterItem id="excludedSales" label="VENDAS EXCLUÍDAS" icon={<ListFilter className="h-4 w-4" />}>
								<MultipleSalesSelectInput
									label="VENDAS EXCLUÍDAS"
									selected={queryParams.excludedSalesIds}
									handleChange={(excludedSalesIds) => updateQueryParams({ excludedSalesIds: excludedSalesIds as string[] })}
									onReset={() => updateQueryParams({ excludedSalesIds: [] })}
									resetOptionLabel="VENDAS EXCLUÍDAS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function CommercialTotalFilter({ queryParams, updateQueryParams }: Pick<CommercialInlineFiltersProps, "queryParams" | "updateQueryParams">) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<BadgeDollarSign className="h-4 w-4" />
					<InteractiveFilter.Label>VALOR</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveNumberRangeSummary(queryParams.total.min, queryParams.total.max)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={() => updateQueryParams({ total: {} })} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-80 p-0">
				<InteractiveFilter.NumberRangeContent
					value={{ greaterThan: queryParams.total.min, lessThan: queryParams.total.max }}
					onChange={({ greaterThan, lessThan }) => updateQueryParams({ total: { min: greaterThan ?? undefined, max: lessThan ?? undefined } })}
					onClear={() => updateQueryParams({ total: {} })}
				/>
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

function CommercialExcludedSalesFilter({ queryParams, updateQueryParams }: Pick<CommercialInlineFiltersProps, "queryParams" | "updateQueryParams">) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>VENDAS EXCLUÍDAS</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveCountSummary(queryParams.excludedSalesIds)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={() => updateQueryParams({ excludedSalesIds: [] })} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-80 p-3">
				<MultipleSalesSelectInput
					label="VENDAS EXCLUÍDAS"
					selected={queryParams.excludedSalesIds}
					handleChange={(excludedSalesIds) => updateQueryParams({ excludedSalesIds: excludedSalesIds as string[] })}
					onReset={() => updateQueryParams({ excludedSalesIds: [] })}
					resetOptionLabel="VENDAS EXCLUÍDAS"
				/>
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

function CommercialMultiFilter({
	label,
	options,
	value,
	onChange,
	onClear,
}: {
	label: string;
	options: InteractiveFilterOption<string>[];
	value: string[];
	onChange: (value: string[]) => void;
	onClear: () => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveOptionSummary(options, value)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={onClear} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.MultiContent options={options} value={value} onChange={onChange} onClear={onClear} clearLabel="TODOS" />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}
