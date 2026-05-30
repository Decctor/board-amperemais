"use client";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import MultipleSalesSelectInput from "@/components/Inputs/SelectMultipleSalesInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import PlanRestrictionComponent from "@/components/Layouts/PlanRestrictionComponent";
import NewProduct from "@/components/Modals/Products/NewProduct";
import ProductsGraphs from "@/components/Products/ProductsGraphs";
import ProductsRanking from "@/components/Products/ProductsRanking";
import ProductsPortfolioAnalysisSection from "@/app/dashboard/commercial/products/portfolio-analysis-section";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { InteractiveFilter, type InteractiveFilterOption, type InteractiveFilterSortValue } from "@/components/ui/interactive-filter";
import { Input } from "@/components/ui/input";
import { StatBadge } from "@/components/ui/stat-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import {
	formatInteractiveCountSummary,
	formatInteractiveDateRangeSummary,
	formatInteractiveNumberRangeSummary,
	formatInteractiveOptionSummary,
	formatInteractiveSortFieldSummary,
	isInteractiveSortActive,
} from "@/lib/interactive-filter-formatting";
import { useProducts, useProductsOverallStats } from "@/lib/queries/products";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { cn } from "@/lib/utils";
import type { TGetProductsDefaultInput, TGetProductsOutputDefault } from "@/app/api/products/route";
import type { TGetProductsOverallStatsInput } from "@/app/api/products/stats/overall/route";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	BadgeDollarSign,
	Calendar,
	CirclePlus,
	Clock,
	Code,
	Diamond,
	DollarSign,
	Info,
	ListFilter,
	Package,
	PencilIcon,
	Plus,
	RefreshCw,
	ShoppingCart,
	Star,
	TrendingUp,
	Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";

type ProductsPageProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};

export default function ProductsPage({ user, userOrg }: ProductsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "database"]));

	if (userOrg?.assinaturaPlano === "ESSENCIAL") {
		return (
			<PlanRestrictionComponent
				title="Recurso Exclusivo"
				message="Este recurso não está disponível no plano ESSENCIAL. Faça um upgrade para desbloquear todo o potencial."
			/>
		);
	}

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v: string) => setViewMode(v as "stats" | "database")}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="database" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Users className="w-4 h-4 min-w-4 min-h-4" />
						Banco de Dados
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats">
					<ProductsStatsView />
				</TabsContent>
				<TabsContent value="database">
					<ProductsDatabaseView user={user} organization={userOrg} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

type ProductsDatabaseViewProps = {
	user: TAuthUserSession["user"];
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};
function ProductsDatabaseView({ user, organization }: ProductsDatabaseViewProps) {
	const orgHasStockTracking = organization.configuracao.preferencias.rastreamentoEstoque;
	const queryClient = useQueryClient();
	const [newProductModalIsOpen, setNewProductModalIsOpen] = useState<boolean>(false);
	const {
		data: productsResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useProducts({
		initialFilters: {
			search: "",
			groups: [],
			statsPeriodAfter: dayjs().startOf("month").toDate(),
			statsPeriodBefore: dayjs().endOf("month").toDate(),
			statsSaleNatures: [],
			statsExcludedSalesIds: [],
			statsTotalMin: null,
			statsTotalMax: null,
			stockStatus: [],
			abcClasses: [],
			priceMin: null,
			priceMax: null,
			orderByField: "descricao",
			orderByDirection: "asc",
		},
	});

	const products = productsResult?.products;
	const productsShowing = products ? products.length : 0;
	const productsMatched = productsResult?.productsMatched || 0;
	const totalPages = productsResult?.totalPages;

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar produto..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setNewProductModalIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					NOVO PRODUTO
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={productsMatched > 0 ? `${productsMatched} produtos encontrados.` : `${productsMatched} produto encontrado.`}
				itemsShowingText={productsShowing > 0 ? `Mostrando ${productsShowing} produtos.` : `Mostrando ${productsShowing} produto.`}
			/>
			<ProductsInlineFilters filters={filters} updateFilters={updateFilters} />
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && products ? (
				products.length > 0 ? (
					products.map((product) => (
						<ProductCard
							key={product.id}
							product={product}
							periodAfter={filters.statsPeriodAfter}
							periodBefore={filters.statsPeriodBefore}
							showStockData={orgHasStockTracking}
						/>
					))
				) : (
					<p className="w-full tracking-tight text-center">Nenhum produto encontrado.</p>
				)
			) : null}
			{newProductModalIsOpen ? (
				<NewProduct user={user} closeModal={() => setNewProductModalIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
			) : null}
		</div>
	);
}

type ProductsInlineFiltersProps = {
	filters: TGetProductsDefaultInput;
	updateFilters: (filters: Partial<TGetProductsDefaultInput>) => void;
};

function ProductsInlineFilters({ filters, updateFilters }: ProductsInlineFiltersProps) {
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
	const abcClassOptions = [
		{ id: "A", label: "A", value: "A" },
		{ id: "B", label: "B", value: "B" },
		{ id: "C", label: "C", value: "C" },
	] satisfies InteractiveFilterOption<string>[];
	const orderFieldOptions = [
		{ id: "descricao", label: "DESCRIÇÃO", value: "descricao" },
		{ id: "codigo", label: "CÓDIGO", value: "codigo" },
		{ id: "grupo", label: "GRUPO", value: "grupo" },
		{ id: "vendasValorTotal", label: "VALOR TOTAL DE VENDAS", value: "vendasValorTotal" },
		{ id: "vendasQtdeTotal", label: "QUANTIDADE TOTAL DE VENDAS", value: "vendasQtdeTotal" },
		{ id: "quantidade", label: "QUANTIDADE EM ESTOQUE", value: "quantidade" },
	] satisfies InteractiveFilterOption<NonNullable<TGetProductsDefaultInput["orderByField"]>>[];
	const defaultSort = {
		field: "descricao",
		direction: "asc",
	} satisfies InteractiveFilterSortValue<NonNullable<TGetProductsDefaultInput["orderByField"]>>;
	const sortValue = {
		field: filters.orderByField ?? defaultSort.field,
		direction: filters.orderByDirection ?? defaultSort.direction,
	} satisfies InteractiveFilterSortValue<NonNullable<TGetProductsDefaultInput["orderByField"]>>;
	const hasGroups = (filters.groups ?? []).length > 0;
	const hasSaleNatures = (filters.statsSaleNatures ?? []).length > 0;
	const hasSellers = (filters.statsSellerIds ?? []).length > 0;
	const hasStock = (filters.stockStatus ?? []).length > 0;
	const hasABCClasses = (filters.abcClasses ?? []).length > 0;
	const hasPrice = filters.priceMin != null || filters.priceMax != null;
	const hasStatsTotal = filters.statsTotalMin != null || filters.statsTotalMax != null;
	const hasExcludedSales = (filters.statsExcludedSalesIds ?? []).length > 0;
	const hasActiveSort = isInteractiveSortActive(sortValue, defaultSort);

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
			{hasABCClasses ? (
				<ProductsMultiFilter
					label="CURVA ABC"
					options={abcClassOptions}
					value={filters.abcClasses ?? []}
					onChange={(abcClasses) => updateFilters({ abcClasses, page: 1 })}
					onClear={() => updateFilters({ abcClasses: [], page: 1 })}
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
			{hasActiveSort ? (
				<ProductsSortFilter
					fieldOptions={orderFieldOptions}
					value={sortValue}
					onChange={({ field, direction }) => updateFilters({ orderByField: field, orderByDirection: direction, page: 1 })}
					onClear={() => updateFilters({ orderByField: defaultSort.field, orderByDirection: defaultSort.direction, page: 1 })}
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
						{!hasABCClasses ? (
							<InteractiveFilter.AddFilterItem id="abcClasses" label="CURVA ABC" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={abcClassOptions}
									value={filters.abcClasses ?? []}
									onChange={(abcClasses) => updateFilters({ abcClasses, page: 1 })}
									onClear={() => updateFilters({ abcClasses: [], page: 1 })}
									clearLabel="TODAS"
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
						{!hasActiveSort ? (
							<InteractiveFilter.AddFilterItem id="sort" label="ORDENAR POR" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.SortContent
									fieldOptions={orderFieldOptions}
									value={sortValue}
									onChange={({ field, direction }) => updateFilters({ orderByField: field, orderByDirection: direction, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function ProductsSortFilter<TField extends string>({
	fieldOptions,
	value,
	onChange,
	onClear,
}: {
	fieldOptions: InteractiveFilterOption<TField>[];
	value: InteractiveFilterSortValue<TField>;
	onChange: (nextValue: InteractiveFilterSortValue<TField>) => void;
	onClear: () => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ORDENAR POR</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveSortFieldSummary(fieldOptions, value.field)}</InteractiveFilter.Value>
				<InteractiveFilter.SortDirectionToggle direction={value.direction} onDirectionChange={(direction) => onChange({ ...value, direction })} />
				<InteractiveFilter.Clear onClear={onClear} label="Limpar ordenação" />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.SortContent fieldOptions={fieldOptions} value={value} onChange={onChange} />
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

function ProductsStatsView() {
	const initialStartDate = dayjs().startOf("month");
	const initialEndDate = dayjs().endOf("month");
	const [filters, setFilters] = useState<TGetProductsOverallStatsInput>({
		periodAfter: initialStartDate.toDate(),
		periodBefore: initialEndDate.toDate(),
		comparingPeriodAfter: initialStartDate.subtract(1, "month").toDate(),
		comparingPeriodBefore: initialEndDate.subtract(1, "month").toDate(),
	});

	const { data: productsOverallStats } = useProductsOverallStats({
		periodAfter: filters.periodAfter,
		periodBefore: filters.periodBefore,
		comparingPeriodAfter: filters.comparingPeriodAfter,
		comparingPeriodBefore: filters.comparingPeriodBefore,
	});

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<DateIntervalInput
					label="Período"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{
						after: filters.periodAfter ? new Date(filters.periodAfter) : undefined,
						before: filters.periodBefore ? new Date(filters.periodBefore) : undefined,
					}}
					handleChange={(value) =>
						setFilters((prev) => ({
							...prev,
							periodAfter: value.after ? new Date(value.after) : null,
							periodBefore: value.before ? new Date(value.before) : null,
							comparingPeriodAfter: value.after ? dayjs(value.after).subtract(1, "month").toDate() : null,
							comparingPeriodBefore: value.before ? dayjs(value.before).subtract(1, "month").toDate() : null,
						}))
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE PRODUTOS"
					icon={<Package className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.totalProducts.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						productsOverallStats?.totalProducts.comparison
							? {
									value: productsOverallStats?.totalProducts.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="PRODUTOS ATIVOS"
					icon={<Activity className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.activeProducts.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						productsOverallStats?.activeProducts.comparison
							? {
									value: productsOverallStats?.activeProducts.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="FATURAMENTO TOTAL"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.totalRevenue.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						productsOverallStats?.totalRevenue.comparison
							? {
									value: productsOverallStats?.totalRevenue.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="MARGEM MÉDIA"
					icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.averageMargin.current || 0,
						format: (n) => `${formatDecimalPlaces(n)}%`,
					}}
					previous={
						productsOverallStats?.averageMargin.comparison
							? {
									value: productsOverallStats?.averageMargin.comparison || 0,
									format: (n) => `${formatDecimalPlaces(n)}%`,
								}
							: undefined
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="GIRO MÉDIO DE ESTOQUE"
					icon={<RefreshCw className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.averageTurnoverDays.current || 0,
						format: (n) => `${formatDecimalPlaces(n)} dias`,
					}}
					previous={
						productsOverallStats?.averageTurnoverDays.comparison
							? {
									value: productsOverallStats?.averageTurnoverDays.comparison || 0,
									format: (n) => `${formatDecimalPlaces(n)} dias`,
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="PRODUTOS SEM ESTOQUE"
					icon={<AlertTriangle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.stockHealth.current?.outOfStock || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						productsOverallStats?.stockHealth.comparison
							? {
									value: productsOverallStats?.stockHealth.comparison?.outOfStock || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="PRODUTOS ESTOQUE BAIXO"
					icon={<AlertTriangle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.stockHealth.current?.lowStock || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						productsOverallStats?.stockHealth.comparison
							? {
									value: productsOverallStats?.stockHealth.comparison?.lowStock || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="ESTOQUE EM RISCO"
					icon={<AlertCircle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: productsOverallStats?.atRiskInventory.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						productsOverallStats?.atRiskInventory.comparison
							? {
									value: productsOverallStats?.atRiskInventory.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 h-[550px]">
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<ProductsGraphs periodAfter={filters.periodAfter} periodBefore={filters.periodBefore} />
				</div>
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<ProductsRanking
						periodAfter={filters.periodAfter}
						periodBefore={filters.periodBefore}
						comparingPeriodAfter={filters.comparingPeriodAfter}
						comparingPeriodBefore={filters.comparingPeriodBefore}
					/>
				</div>
			</div>
			<ProductsPortfolioAnalysisSection periodAfter={filters.periodAfter} periodBefore={filters.periodBefore} />
		</div>
	);
}

function ProductCard({
	product,
	periodAfter,
	periodBefore,
	showStockData,
}: {
	product: TGetProductsOutputDefault["products"][number];
	periodAfter: Date | null;
	periodBefore: Date | null;
	showStockData: boolean;
}) {
	// Calculate stock status
	const quantidade = product.quantidade ?? 0;
	const getStockStatus = () => {
		if (quantidade === 0)
			return {
				status: "out",
				label: "SEM ESTOQUE",
				color: "bg-red-500 dark:bg-red-600 text-white",
			};
		if (quantidade <= 10)
			return {
				status: "low",
				label: `${quantidade} UN`,
				color: "bg-yellow-500 dark:bg-yellow-600 text-white",
			};
		if (quantidade <= 50)
			return {
				status: "healthy",
				label: `${quantidade} UN`,
				color: "bg-green-500 dark:bg-green-600 text-white",
			};
		return {
			status: "overstocked",
			label: `${quantidade} UN`,
			color: "bg-blue-500 dark:bg-blue-600 text-white",
		};
	};
	const stockStatus = getStockStatus();

	// Calculate turnover (days of stock remaining)
	const calculateTurnover = () => {
		const qtySold = product.estatisticas.vendasQtdeTotal;
		// If no sales in the period, we can't calculate turnover
		if (qtySold === 0) return null;

		// If no stock, return 0 days (product has no stock remaining)
		if (quantidade === 0) return { days: 0, isCapped: false };

		// Calculate days in period dynamically
		let daysInPeriod = 30; // Fallback to 30 days if period is not available
		if (periodAfter && periodBefore) {
			const diff = dayjs(periodBefore).diff(dayjs(periodAfter), "day") + 1; // +1 to include both start and end days
			if (diff > 0) {
				daysInPeriod = diff;
			}
		}

		const avgDailySales = qtySold / daysInPeriod;
		const daysOfStock = quantidade / avgDailySales;
		const roundedDays = Math.round(daysOfStock);

		// Cap at 365 days to keep display reasonable (anything over a year is problematic anyway)
		const isCapped = roundedDays > 365;
		return { days: Math.min(roundedDays, 365), isCapped };
	};
	const turnoverResult = calculateTurnover();
	const turnoverDays = turnoverResult?.days ?? null;

	return (
		<div className={cn("bg-card border-border flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="relative h-16 max-h-16 min-h-16 w-16 max-w-16 min-w-16 overflow-hidden rounded-lg">
					{product.imagemCapaUrl ? (
						<Image src={product.imagemCapaUrl} alt="Imagem de capa do produto" fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-foreground-foreground flex h-full w-full items-center justify-center">
							<ShoppingCart className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className=" flex flex-col grow gap-1">
				<div className="w-full flex items-center flex-col md:flex-row justify-between gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{product.descricao}</h1>
						<div className="flex items-center gap-1">
							<Code className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">{product.codigo}</h1>
						</div>
						{product.grupo ? (
							<div className="flex items-center gap-1">
								<Diamond className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">{product.grupo}</h1>
							</div>
						) : null}
					</div>
					<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
						<TooltipProvider>
							<div className="flex items-center gap-3 flex-wrap">
								{showStockData ? (
									<>
										{/* Stock Status Badge */}
										<StatBadge
											icon={<Package className="w-4 min-w-4 h-4 min-h-4" />}
											value={stockStatus.label}
											tooltipContent="Quantidade em estoque atual"
											className={cn(stockStatus.color)}
										/>
										{/* Turnover Indicator */}
										{turnoverDays !== null && (
											<StatBadge
												icon={<Clock className="w-4 min-w-4 h-4 min-h-4" />}
												value={turnoverResult?.isCapped ? `${turnoverDays}+D` : `${turnoverDays}D`}
												tooltipContent="Dias de estoque restantes no ritmo de vendas atual"
												className={cn({
													"bg-red-500 dark:bg-red-600 text-white": turnoverDays < 7,
													"bg-yellow-500 dark:bg-yellow-600 text-white": turnoverDays >= 7 && turnoverDays < 30,
													"bg-green-500 dark:bg-green-600 text-white": turnoverDays >= 30 && turnoverDays < 90,
													"bg-blue-500 dark:bg-blue-600 text-white": turnoverDays >= 90 && turnoverDays < 180,
													"bg-purple-500 dark:bg-purple-600 text-white": turnoverDays >= 180,
												})}
											/>
										)}
									</>
								) : null}

								<StatBadge
									icon={<CirclePlus className="w-4 min-w-4 h-4 min-h-4" />}
									value={product.estatisticas.vendasQtdeTotal}
									tooltipContent="Quantidade total vendida no período"
								/>
								<StatBadge
									icon={<BadgeDollarSign className="w-4 min-w-4 h-4 min-h-4" />}
									value={formatToMoney(product.estatisticas.vendasValorTotal)}
									tooltipContent="Faturamento total no período"
								/>
								<StatBadge
									icon={<Star className="w-4 min-w-4 h-4 min-h-4" />}
									value={product.estatisticas.curvaABC}
									tooltipContent={`Curva ABC: ${
										product.estatisticas.curvaABC === "A"
											? "80% do faturamento"
											: product.estatisticas.curvaABC === "B"
												? "15% do faturamento"
												: "5% do faturamento"
									}`}
									className={cn({
										"bg-green-500 dark:bg-green-600 text-white": product.estatisticas.curvaABC === "A",
										"bg-yellow-500 dark:bg-yellow-600 text-white": product.estatisticas.curvaABC === "B",
										"bg-red-500 dark:bg-red-600 text-white": product.estatisticas.curvaABC === "C",
									})}
								/>
							</div>
						</TooltipProvider>
					</div>
				</div>
				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1">
							<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-foreground/80">
								{product.precoVenda ? `${formatToMoney(product.precoVenda)} / ${product.unidade}` : "PREÇO DE VENDA NÃO DEFINIDO"}
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<Button variant="ghost" className="flex items-center gap-1.5" size="sm" asChild>
							<Link href={`/dashboard/commercial/products/id/${product.id}?tab=cadastro`}>
								<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
								EDITAR
							</Link>
						</Button>
						<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
							<Link href={`/dashboard/commercial/products/id/${product.id}`}>
								<Info className="w-3 min-w-3 h-3 min-h-3" />
								DETALHES
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
