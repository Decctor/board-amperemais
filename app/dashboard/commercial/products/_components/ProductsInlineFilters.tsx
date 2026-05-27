"use client";

import MultipleSalesSelectInput from "@/components/Inputs/SelectMultipleSalesInput";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import {
	formatInteractiveCountSummary,
	formatInteractiveDateRangeSummary,
	formatInteractiveNumberRangeSummary,
	formatInteractiveOptionSummary,
} from "@/lib/interactive-filter-formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TGetProductsDefaultInput } from "@/app/api/products/route";
import { BadgeDollarSign, Calendar, ListFilter } from "lucide-react";

type ProductsInlineFiltersProps = {
	filters: TGetProductsDefaultInput;
	updateFilters: (filters: Partial<TGetProductsDefaultInput>) => void;
};

export default function ProductsInlineFilters({ filters, updateFilters }: ProductsInlineFiltersProps) {
	const { data: filterOptions } = useSaleQueryFilterOptions();
	const groupOptions = (filterOptions?.productsGroups ?? []) as InteractiveFilterOption<string>[];
	const saleNatureOptions = (filterOptions?.saleNatures ?? []) as InteractiveFilterOption<string>[];
	const sellerOptions = (filterOptions?.sellers ?? []) as InteractiveFilterOption<string>[];
	const stockStatusOptions = [
		{ id: "out", label: "SEM ESTOQUE", value: "out" },
		{ id: "low", label: "ESTOQUE BAIXO", value: "low" },
		{ id: "healthy", label: "ESTOQUE SAUDÁVEL", value: "healthy" },
		{ id: "overstocked", label: "EXCESSO DE ESTOQUE", value: "overstocked" },
	] satisfies InteractiveFilterOption<string>[];
	const orderFieldOptions = [
		{ id: "descricao", label: "DESCRIÇÃO", value: "descricao" },
		{ id: "codigo", label: "CÓDIGO", value: "codigo" },
		{ id: "grupo", label: "GRUPO", value: "grupo" },
		{ id: "vendasValorTotal", label: "VALOR TOTAL DE VENDAS", value: "vendasValorTotal" },
		{ id: "vendasQtdeTotal", label: "QUANTIDADE TOTAL DE VENDAS", value: "vendasQtdeTotal" },
		{ id: "quantidade", label: "QUANTIDADE EM ESTOQUE", value: "quantidade" },
	] satisfies InteractiveFilterOption<NonNullable<TGetProductsDefaultInput["orderByField"]>>[];
	const orderDirectionOptions = [
		{ id: "asc", label: "CRESCENTE", value: "asc" },
		{ id: "desc", label: "DECRESCENTE", value: "desc" },
	] satisfies InteractiveFilterOption<NonNullable<TGetProductsDefaultInput["orderByDirection"]>>[];
	const hasGroups = (filters.groups ?? []).length > 0;
	const hasSaleNatures = (filters.statsSaleNatures ?? []).length > 0;
	const hasSellers = (filters.statsSellerIds ?? []).length > 0;
	const hasStock = (filters.stockStatus ?? []).length > 0;
	const hasPrice = filters.priceMin != null || filters.priceMax != null;
	const hasStatsTotal = filters.statsTotalMin != null || filters.statsTotalMax != null;
	const hasExcludedSales = (filters.statsExcludedSalesIds ?? []).length > 0;
	const hasOrderByField = Boolean(filters.orderByField && filters.orderByField !== "descricao");
	const hasOrderByDirection = Boolean(filters.orderByDirection && filters.orderByDirection !== "asc");

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<Calendar className="h-4 w-4" />
						<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(filters.statsPeriodAfter, filters.statsPeriodBefore)}</InteractiveFilter.Value>
					<InteractiveFilter.Clear onClear={() => updateFilters({ statsPeriodAfter: null, statsPeriodBefore: null, page: 1 })} />
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-auto p-0">
					<InteractiveFilter.DateRangeContent
						value={{
							from: filters.statsPeriodAfter ? new Date(filters.statsPeriodAfter) : undefined,
							to: filters.statsPeriodBefore ? new Date(filters.statsPeriodBefore) : undefined,
						}}
						onChange={(period) => updateFilters({ statsPeriodAfter: period.from ?? null, statsPeriodBefore: period.to ?? null, page: 1 })}
					/>
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasGroups ? (
				<ProductsMultiFilter
					label="GRUPOS"
					options={groupOptions}
					value={filters.groups ?? []}
					onChange={(groups) => updateFilters({ groups, page: 1 })}
					onClear={() => updateFilters({ groups: [], page: 1 })}
				/>
			) : null}
			{hasSaleNatures ? (
				<ProductsMultiFilter
					label="NATUREZAS"
					options={saleNatureOptions}
					value={filters.statsSaleNatures ?? []}
					onChange={(statsSaleNatures) => updateFilters({ statsSaleNatures, page: 1 })}
					onClear={() => updateFilters({ statsSaleNatures: [], page: 1 })}
				/>
			) : null}
			{hasSellers ? (
				<ProductsMultiFilter
					label="VENDEDORES"
					options={sellerOptions}
					value={filters.statsSellerIds ?? []}
					onChange={(statsSellerIds) => updateFilters({ statsSellerIds, page: 1 })}
					onClear={() => updateFilters({ statsSellerIds: [], page: 1 })}
				/>
			) : null}
			{hasStock ? (
				<ProductsMultiFilter
					label="ESTOQUE"
					options={stockStatusOptions}
					value={filters.stockStatus ?? []}
					onChange={(stockStatus) => updateFilters({ stockStatus, page: 1 })}
					onClear={() => updateFilters({ stockStatus: [], page: 1 })}
				/>
			) : null}
			{hasPrice ? (
				<ProductsNumberRangeFilter
					label="PREÇO"
					min={filters.priceMin}
					max={filters.priceMax}
					onChange={({ greaterThan, lessThan }) => updateFilters({ priceMin: greaterThan, priceMax: lessThan, page: 1 })}
					onClear={() => updateFilters({ priceMin: null, priceMax: null, page: 1 })}
				/>
			) : null}
			{hasStatsTotal ? (
				<ProductsNumberRangeFilter
					label="VALOR VENDIDO"
					min={filters.statsTotalMin}
					max={filters.statsTotalMax}
					onChange={({ greaterThan, lessThan }) => updateFilters({ statsTotalMin: greaterThan, statsTotalMax: lessThan, page: 1 })}
					onClear={() => updateFilters({ statsTotalMin: null, statsTotalMax: null, page: 1 })}
				/>
			) : null}
			{hasExcludedSales ? <ProductsExcludedSalesFilter filters={filters} updateFilters={updateFilters} /> : null}
			{hasOrderByField ? (
				<ProductsSingleFilter
					label="ORDENAR POR"
					options={orderFieldOptions}
					value={filters.orderByField ?? "descricao"}
					onChange={(orderByField) => updateFilters({ orderByField, page: 1 })}
				/>
			) : null}
			{hasOrderByDirection ? (
				<ProductsSingleFilter
					label="DIREÇÃO"
					options={orderDirectionOptions}
					value={filters.orderByDirection ?? "asc"}
					onChange={(orderByDirection) => updateFilters({ orderByDirection, page: 1 })}
				/>
			) : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
				</InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasGroups ? (
							<InteractiveFilter.AddFilterItem id="groups" label="GRUPOS" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={groupOptions}
									value={filters.groups ?? []}
									onChange={(groups) => updateFilters({ groups, page: 1 })}
									onClear={() => updateFilters({ groups: [], page: 1 })}
									clearLabel="TODOS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasSaleNatures ? (
							<InteractiveFilter.AddFilterItem id="saleNatures" label="NATUREZAS" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={saleNatureOptions}
									value={filters.statsSaleNatures ?? []}
									onChange={(statsSaleNatures) => updateFilters({ statsSaleNatures, page: 1 })}
									onClear={() => updateFilters({ statsSaleNatures: [], page: 1 })}
									clearLabel="TODAS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasSellers ? (
							<InteractiveFilter.AddFilterItem id="sellers" label="VENDEDORES" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={sellerOptions}
									value={filters.statsSellerIds ?? []}
									onChange={(statsSellerIds) => updateFilters({ statsSellerIds, page: 1 })}
									onClear={() => updateFilters({ statsSellerIds: [], page: 1 })}
									clearLabel="TODOS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasStock ? (
							<InteractiveFilter.AddFilterItem id="stock" label="ESTOQUE" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={stockStatusOptions}
									value={filters.stockStatus ?? []}
									onChange={(stockStatus) => updateFilters({ stockStatus, page: 1 })}
									onClear={() => updateFilters({ stockStatus: [], page: 1 })}
									clearLabel="TODOS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasPrice ? (
							<InteractiveFilter.AddFilterItem id="price" label="PREÇO" icon={<BadgeDollarSign className="h-4 w-4" />}>
								<InteractiveFilter.NumberRangeContent
									value={{ greaterThan: filters.priceMin, lessThan: filters.priceMax }}
									onChange={({ greaterThan, lessThan }) => updateFilters({ priceMin: greaterThan, priceMax: lessThan, page: 1 })}
									onClear={() => updateFilters({ priceMin: null, priceMax: null, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasStatsTotal ? (
							<InteractiveFilter.AddFilterItem id="statsTotal" label="VALOR VENDIDO" icon={<BadgeDollarSign className="h-4 w-4" />}>
								<InteractiveFilter.NumberRangeContent
									value={{ greaterThan: filters.statsTotalMin, lessThan: filters.statsTotalMax }}
									onChange={({ greaterThan, lessThan }) => updateFilters({ statsTotalMin: greaterThan, statsTotalMax: lessThan, page: 1 })}
									onClear={() => updateFilters({ statsTotalMin: null, statsTotalMax: null, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasExcludedSales ? (
							<InteractiveFilter.AddFilterItem id="excludedSales" label="VENDAS EXCLUÍDAS" icon={<ListFilter className="h-4 w-4" />}>
								<ProductsExcludedSalesFilterContent filters={filters} updateFilters={updateFilters} />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasOrderByField ? (
							<InteractiveFilter.AddFilterItem id="orderByField" label="ORDENAR POR" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.SingleContent
									options={orderFieldOptions}
									value={filters.orderByField ?? "descricao"}
									onChange={(orderByField) => updateFilters({ orderByField, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasOrderByDirection ? (
							<InteractiveFilter.AddFilterItem id="orderByDirection" label="DIREÇÃO" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.SingleContent
									options={orderDirectionOptions}
									value={filters.orderByDirection ?? "asc"}
									onChange={(orderByDirection) => updateFilters({ orderByDirection, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function ProductsSingleFilter<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: InteractiveFilterOption<T>[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{options.find((option) => option.value === value)?.label ?? "PADRÃO"}</InteractiveFilter.Value>
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.SingleContent options={options} value={value} onChange={onChange} />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

function ProductsExcludedSalesFilter({ filters, updateFilters }: ProductsInlineFiltersProps) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>VENDAS EXCLUÍDAS</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveCountSummary(filters.statsExcludedSalesIds ?? [])}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={() => updateFilters({ statsExcludedSalesIds: [], page: 1 })} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-80 p-3">
				<ProductsExcludedSalesFilterContent filters={filters} updateFilters={updateFilters} />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

function ProductsExcludedSalesFilterContent({ filters, updateFilters }: ProductsInlineFiltersProps) {
	return (
		<MultipleSalesSelectInput
			label="VENDAS EXCLUÍDAS"
			selected={filters.statsExcludedSalesIds ?? []}
			handleChange={(statsExcludedSalesIds) => updateFilters({ statsExcludedSalesIds: statsExcludedSalesIds as string[], page: 1 })}
			onReset={() => updateFilters({ statsExcludedSalesIds: [], page: 1 })}
			resetOptionLabel="VENDAS EXCLUÍDAS"
			width="100%"
		/>
	);
}

function ProductsMultiFilter({
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

function ProductsNumberRangeFilter({
	label,
	min,
	max,
	onChange,
	onClear,
}: {
	label: string;
	min?: number | null;
	max?: number | null;
	onChange: (value: { greaterThan?: number | null; lessThan?: number | null }) => void;
	onClear: () => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<BadgeDollarSign className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveNumberRangeSummary(min, max)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={onClear} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-80 p-0">
				<InteractiveFilter.NumberRangeContent value={{ greaterThan: min, lessThan: max }} onChange={onChange} onClear={onClear} />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}
