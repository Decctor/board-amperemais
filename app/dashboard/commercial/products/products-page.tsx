"use client";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlProduct from "@/components/Modals/Products/ControlProduct";
import ProductsFilterMenu from "@/components/Products/ProductsFilterMenu";
import ProductsGraphs from "@/components/Products/ProductsGraphs";
import ProductsRanking from "@/components/Products/ProductsRanking";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useProducts, useProductsOverallStats } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import type { TGetProductsDefaultInput, TGetProductsOutputDefault } from "@/pages/api/products";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	BadgeDollarSign,
	CirclePlus,
	Clock,
	Code,
	Diamond,
	Info,
	ListFilter,
	Package,
	Pencil,
	PencilIcon,
	RefreshCw,
	Search,
	ShoppingBag,
	ShoppingCart,
	Star,
	TrendingUp,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductsPageProps = {
	user: TAuthUserSession["user"];
};

export default function ProductsPage({ user }: ProductsPageProps) {
	const queryClient = useQueryClient();
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const [editProductModalId, setEditProductModalId] = useState<string | null>(null);
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
		<div className="w-full h-full flex flex-col gap-3">
			<ProductsStats overallFilters={filters} />

			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar produto..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
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
			<ProductsFiltersShowcase filters={filters} updateFilters={updateFilters} />
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && products ? (
				products.length > 0 ? (
					products.map((product, index: number) => (
						<ProductCard key={product.id} product={product} handleEditClick={() => setEditProductModalId(product.id)} />
					))
				) : (
					<p className="w-full tracking-tight text-center">Nenhum produto encontrado.</p>
				)
			) : null}
			{editProductModalId ? (
				<ControlProduct
					productId={editProductModalId}
					user={user}
					closeModal={() => setEditProductModalId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{filterMenuIsOpen ? (
				<ProductsFilterMenu queryParams={filters} updateQueryParams={updateFilters} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
		</div>
	);
}

type ProductsStatsProps = {
	overallFilters: TGetProductsDefaultInput;
};
function ProductsStats({ overallFilters }: ProductsStatsProps) {
	const { data: productsOverallStats, isLoading: productsOverallStatsLoading } = useProductsOverallStats({
		periodAfter: overallFilters.statsPeriodAfter,
		periodBefore: overallFilters.statsPeriodBefore,
		comparingPeriodAfter: null,
		comparingPeriodBefore: null,
	});

	return (
		<div className="w-full flex flex-col gap-3">
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
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 max-h-[500px]">
				<div className="w-full lg:w-1/2 h-full">
					<ProductsGraphs periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
				<div className="w-full lg:w-1/2 h-full">
					<ProductsRanking periodAfter={overallFilters.statsPeriodAfter} periodBefore={overallFilters.statsPeriodBefore} />
				</div>
			</div>
		</div>
	);
}

function ProductCard({ product, handleEditClick }: { product: TGetProductsOutputDefault["products"][number]; handleEditClick: () => void }) {
	// Calculate stock status
	const quantidade = product.quantidade ?? 0;
	const getStockStatus = () => {
		if (quantidade === 0) return { status: "out", label: "SEM ESTOQUE", color: "bg-red-500 dark:bg-red-600 text-white" };
		if (quantidade <= 10) return { status: "low", label: `${quantidade} UN`, color: "bg-yellow-500 dark:bg-yellow-600 text-white" };
		if (quantidade <= 50) return { status: "healthy", label: `${quantidade} UN`, color: "bg-green-500 dark:bg-green-600 text-white" };
		return { status: "overstocked", label: `${quantidade} UN`, color: "bg-blue-500 dark:bg-blue-600 text-white" };
	};
	const stockStatus = getStockStatus();

	// Calculate turnover (days of stock remaining)
	const calculateTurnover = () => {
		const qtySold = product.estatisticas.vendasQtdeTotal;
		if (qtySold === 0 || quantidade === 0) return null;
		// Assuming stats are for 30 days period (could be calculated from actual period)
		const avgDailySales = qtySold / 30;
		const daysOfStock = quantidade / avgDailySales;
		return Math.round(daysOfStock);
	};
	const turnoverDays = calculateTurnover();

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="relative h-16 max-h-16 min-h-16 w-16 max-w-16 min-w-16 overflow-hidden rounded-lg">
					{product.imagemCapaUrl ? (
						<Image src={product.imagemCapaUrl} alt="Imagem de capa do produto" fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
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
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{product.codigo}</h1>
						</div>
						{product.grupo ? (
							<div className="flex items-center gap-1">
								<Diamond className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{product.grupo}</h1>
							</div>
						) : null}
					</div>
					<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
						<div className="flex items-center gap-3 flex-wrap">
							{/* Stock Status Badge */}
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold", stockStatus.color)}>
								<Package className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{stockStatus.label}</p>
							</div>
							{/* Turnover Indicator */}
							{turnoverDays !== null && (
								<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold", {
									"bg-red-500 dark:bg-red-600 text-white": turnoverDays < 7,
									"bg-yellow-500 dark:bg-yellow-600 text-white": turnoverDays >= 7 && turnoverDays < 30,
									"bg-green-500 dark:bg-green-600 text-white": turnoverDays >= 30 && turnoverDays < 90,
									"bg-blue-500 dark:bg-blue-600 text-white": turnoverDays >= 90,
								})}>
									<Clock className="w-4 min-w-4 h-4 min-h-4" />
									<p className="text-xs font-bold tracking-tight uppercase">{turnoverDays}D</p>
								</div>
							)}
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
								<CirclePlus className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{product.estatisticas.vendasQtdeTotal}</p>
							</div>
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
								<BadgeDollarSign className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(product.estatisticas.vendasValorTotal)}</p>
							</div>
							<div
								className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary", {
									"bg-green-500 dark:bg-green-600 text-white": product.estatisticas.curvaABC === "A",
									"bg-yellow-500 dark:bg-yellow-600 text-white": product.estatisticas.curvaABC === "B",
									"bg-red-500 dark:bg-red-600 text-white": product.estatisticas.curvaABC === "C",
								})}
							>
								<Star className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{product.estatisticas.curvaABC}</p>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex items-center justify-end gap-2 flex-wrap">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
						<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
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
	);
}

type ProductsFiltersShowcaseProps = {
	filters: TGetProductsDefaultInput;
	updateFilters: (filters: Partial<TGetProductsDefaultInput>) => void;
};
function ProductsFiltersShowcase({ filters, updateFilters }: ProductsFiltersShowcaseProps) {
	const ORDERING_FIELDS_MAP = {
		descricao: "DESCRIÇÃO",
		codigo: "CÓDIGO",
		grupo: "GRUPO",
		vendasValorTotal: "VALOR TOTAL DE VENDAS",
		vendasQtdeTotal: "QUANTIDADE TOTAL DE VENDAS",
		quantidade: "QUANTIDADE EM ESTOQUE",
	};
	const ORDERING_DIRECTION_MAP = {
		asc: "CRESCENTE",
		desc: "DECRESCENTE",
	};
	const STOCK_STATUS_MAP = {
		out: "SEM ESTOQUE",
		low: "ESTOQUE BAIXO",
		healthy: "ESTOQUE SAUDÁVEL",
		overstocked: "EXCESSO DE ESTOQUE",
	};
	const FilterTag = ({
		label,
		value,
		onRemove,
	}: {
		label: string;
		value: string;
		onRemove?: () => void;
	}) => (
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
	return (
		<div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
			{filters.search && filters.search.trim().length > 0 && (
				<FilterTag label="PESQUISA" value={filters.search} onRemove={() => updateFilters({ search: "" })} />
			)}
			{filters.groups.length > 0 && <FilterTag label="GRUPOS" value={filters.groups.join(", ")} onRemove={() => updateFilters({ groups: [] })} />}
			{filters.statsTotalMin || filters.statsTotalMax ? (
				<FilterTag
					label="ESTATÍSTICAS - VALOR"
					value={`${filters.statsTotalMin ? `> ${formatToMoney(filters.statsTotalMin)}` : ""}${filters.statsTotalMin && filters.statsTotalMax ? " & " : ""}${filters.statsTotalMax ? `< ${formatToMoney(filters.statsTotalMax)}` : ""}`}
					onRemove={() => updateFilters({ statsTotalMin: null, statsTotalMax: null })}
				/>
			) : null}
			{filters.statsPeriodAfter && filters.statsPeriodBefore && (
				<FilterTag
					label="ESTATÍSTICAS - PERÍODO"
					value={`${formatDateAsLocale(filters.statsPeriodAfter)} a ${formatDateAsLocale(filters.statsPeriodBefore)}`}
					onRemove={() => updateFilters({ statsPeriodAfter: null, statsPeriodBefore: null })}
				/>
			)}
			{filters.statsSaleNatures.length > 0 && (
				<FilterTag
					label="ESTATÍSTICAS - NATUREZAS DAS VENDAS"
					value={filters.statsSaleNatures.join(", ")}
					onRemove={() => updateFilters({ statsSaleNatures: [] })}
				/>
			)}
			{filters.stockStatus && filters.stockStatus.length > 0 && (
				<FilterTag
					label="STATUS DE ESTOQUE"
					value={filters.stockStatus.map((status: string) => STOCK_STATUS_MAP[status as keyof typeof STOCK_STATUS_MAP] || status).join(", ")}
					onRemove={() => updateFilters({ stockStatus: [] })}
				/>
			)}
			{(filters.priceMin || filters.priceMax) && (
				<FilterTag
					label="FAIXA DE PREÇO"
					value={`${filters.priceMin ? `≥ ${formatToMoney(filters.priceMin)}` : ""}${filters.priceMin && filters.priceMax ? " & " : ""}${filters.priceMax ? `≤ ${formatToMoney(filters.priceMax)}` : ""}`}
					onRemove={() => updateFilters({ priceMin: null, priceMax: null })}
				/>
			)}
			{filters.orderByField && filters.orderByDirection && (
				<FilterTag
					label="ORDENAÇÃO"
					value={`${ORDERING_FIELDS_MAP[filters.orderByField]} - ${ORDERING_DIRECTION_MAP[filters.orderByDirection]}`}
					onRemove={() => updateFilters({ orderByField: null, orderByDirection: null })}
				/>
			)}
		</div>
	);
}
