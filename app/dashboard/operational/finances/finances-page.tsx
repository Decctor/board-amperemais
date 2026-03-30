"use client";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseAsStringEnum, useQueryState } from "nuqs";
import {
	BadgeDollarSign,
	Banknote,
	ChartNoAxesColumnIncreasing,
	CircleDot,
	DollarSign,
	List,
	MoveDown,
	MoveUp,
	TrendingUp,
	TriangleAlert,
	ChevronDown,
	ChevronUp,
	ListFilter,
	ArrowRight,
	BookOpen,
	Building2,
	Wallet,
	CheckCircle2,
	Clock,
	AlertCircle,
	CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatToMoney, formatDateAsLocale, formatNameAsInitials } from "@/lib/formatting";
import { AnimatePresence, motion } from "framer-motion";
import { SlideMotionVariants } from "@/lib/animations";
import { useMemo, useState } from "react";
import { useFinancesOverallStats, useFinancesAccountingEntries, useFinancesTransactions, useFinancesAccounts } from "@/lib/queries/finances";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TGetFinancesOverallStatsOutput } from "@/app/api/finances/stats/route";
import { TGetAccountingEntriesOutputDefault } from "@/app/api/finances/accounting-entries/route";
import { TGetFinancialTransactionsOutputDefault } from "@/app/api/finances/financial-transactions/route";
import { TGetFinancialAccountsOutputDefault } from "@/app/api/finances/financial-accounts/route";
import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import { AccountingEntryOriginTypeOptions, FinancialTransactionTypeOptions, SalePaymentMethodsOptions } from "@/utils/select-options";

type FinancesPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function FinancesPage(_props: FinancesPageProps) {
	const [viewMode, setViewMode] = useQueryState(
		"view",
		parseAsStringEnum(["stats", "accounting-entries", "financial-transactions", "financial-accounts"]),
	);
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="accounting-entries" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<List className="w-4 h-4 min-w-4 min-h-4" />
						Lançamentos
					</TabsTrigger>
					<TabsTrigger value="financial-transactions" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
						Movimentações
					</TabsTrigger>
					<TabsTrigger value="financial-accounts" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Banknote className="w-4 h-4 min-w-4 min-h-4" />
						Contas Financeiras
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats" className="flex flex-col gap-3">
					<FinancesStatsView />
				</TabsContent>
				<TabsContent value="accounting-entries" className="flex flex-col gap-3">
					<FinancesAccountingEntriesView />
				</TabsContent>
				<TabsContent value="financial-transactions" className="flex flex-col gap-3">
					<FinancesTransactionsView />
				</TabsContent>
				<TabsContent value="financial-accounts" className="flex flex-col gap-3">
					<FinancesAccountsView />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ============================================================================
// STATS VIEW
// ============================================================================

function FinancesStatsView() {
	const [showResultsByAccount, setShowResultsByAccount] = useState(false);
	const [showLiquidResultDetails, setShowLiquidResultDetails] = useState(false);
	const { data: stats, params, updateParams } = useFinancesOverallStats({ initialParams: {} });

	const totalRevenue = stats?.totalRevenue || 0;
	const totalExpense = stats?.totalExpense || 0;
	const totalCost = stats?.totalCost || 0;
	return (
		<div className="flex w-full flex-col gap-4">
			<div className="w-full flex items-center justify-end">
				<DateIntervalInput
					label="PERÍODO"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{ after: params.periodAfter, before: params.periodBefore }}
					handleChange={(value) => updateParams({ periodAfter: value.after, periodBefore: value.before })}
				/>
			</div>
			<div className="flex w-full flex-col gap-6 lg:flex-row">
				<div className="flex h-full max-h-full w-full flex-col gap-2 lg:w-[40%]">
					<div className={"bg-card border-primary/20 flex w-full flex-col items-center justify-between gap-1 rounded-xl border px-3 py-4 shadow-xs"}>
						<div className="flex w-full flex-row items-center justify-between gap-2">
							<div className="flex items-center justify-start gap-2">
								<div className={"flex h-7 w-7 p-1 items-center justify-center rounded-full bg-primary/20 text-primary"}>
									<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
								</div>
								<h1 className="text-xs font-medium leading-none tracking-tight">POR PLANO DE CONTAS</h1>
							</div>
							<button
								type="button"
								onClick={() => setShowResultsByAccount((prev) => !prev)}
								className={cn(
									"flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full text-primary duration-300 ease-in-out hover:bg-primary/20",
									{
										"bg-primary/30": showResultsByAccount,
									},
								)}
							>
								{!showResultsByAccount ? <ChevronDown width={14} height={14} /> : <ChevronUp width={14} height={14} />}
							</button>
						</div>
						<AnimatePresence>
							{showResultsByAccount ? (
								<motion.div
									key={"additional-info"}
									variants={SlideMotionVariants}
									initial="initial"
									animate="animate"
									exit="exit"
									className="flex w-full flex-col gap-2 "
								>
									{stats?.resultByAccounts.map((account, index) => (
										<motion.div
											key={account.accountId}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: index * 0.1,
											}}
											className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row"
										>
											<h1 className="text-xs font-medium leading-none tracking-tight">{account.accountName}</h1>
											<div className="flex items-center gap-2">
												<h1 className="text-sm font-medium">(-) {formatToMoney(account.totalCredited || 0)}</h1>
												<h1 className="text-sm font-medium">(+) {formatToMoney(account.totalDebited || 0)}</h1>
											</div>
										</motion.div>
									))}
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>
					<div className={"bg-card border-primary/20 flex w-full flex-col items-center justify-between gap-1 rounded-xl border px-3 py-4 shadow-xs"}>
						<div className="flex w-full flex-row items-center justify-between gap-2">
							<div className="flex items-center justify-start gap-2">
								<div className={"flex h-7 w-7 p-1 items-center justify-center rounded-full bg-primary/20 text-primary"}>
									<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
								</div>
								<h1 className="text-xs font-medium leading-none tracking-tight">RESULTADO LÍQUIDO</h1>
								<button
									type="button"
									onClick={() => setShowLiquidResultDetails((prev) => !prev)}
									className={cn(
										"flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full text-primary duration-300 ease-in-out hover:bg-primary/20",
										{
											"bg-primary/30": showLiquidResultDetails,
										},
									)}
								>
									{!showLiquidResultDetails ? <ChevronDown width={14} height={14} /> : <ChevronUp width={14} height={14} />}
								</button>
							</div>

							<h1 className="text-sm font-medium">{formatToMoney(totalRevenue - (totalExpense + totalCost))}</h1>
						</div>
						<AnimatePresence>
							{showLiquidResultDetails ? (
								<motion.div
									key={"additional-info"}
									variants={SlideMotionVariants}
									initial="initial"
									animate="animate"
									exit="exit"
									className="flex w-full flex-col gap-2 "
								>
									{[
										{
											id: "total-revenue",
											name: "TOTAL EM RECEITAS",
											value: totalRevenue,
										},
										{
											id: "total-expense",
											name: "TOTAL EM DESPESAS",
											value: totalExpense,
										},
										{
											id: "total-cost",
											name: "TOTAL EM CUSTOS",
											value: totalCost,
										},
									].map((account, index) => (
										<motion.div
											key={account.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: index * 0.1,
											}}
											className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row"
										>
											<h1 className="text-xs font-medium leading-none tracking-tight">{account.name}</h1>
											<div className={cn("flex items-center gap-1")}>
												<h1 className="text-sm font-medium">{formatToMoney(account.value || 0)}</h1>
											</div>
										</motion.div>
									))}
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>

					<StatCard
						icon={<MoveUp className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-green-200 text-green-600"
						label="TOTAL RECEBIDO"
						value={formatToMoney(stats?.totalInFlow || 0)}
					/>
					<StatCard
						icon={<MoveUp className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-red-200 text-red-600"
						label="TOTAL PAGO"
						value={formatToMoney(stats?.totalOutFlow || 0)}
					/>
					<StatCard
						icon={<CircleDot className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-blue-200 text-blue-600"
						label="TRANSAÇÕES PENDENTES"
						value={
							<div className="flex items-center gap-2">
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-red-200 text-red-600")}>
									<MoveUp className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactions.outflow || 0)}</h2>
								</div>
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-green-200 text-green-600")}>
									<MoveDown className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactions.inflow || 0)}</h2>
								</div>
							</div>
						}
					/>
					<StatCard
						icon={<CircleDot className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-orange-200 text-orange-600"
						label="TRANSAÇÕES P/ HOJE"
						value={
							<div className="flex items-center gap-2">
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-red-200 text-red-600")}>
									<MoveUp className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactionsForToday.outflow || 0)}</h2>
								</div>
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-green-200 text-green-600")}>
									<MoveDown className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactionsForToday.inflow || 0)}</h2>
								</div>
							</div>
						}
					/>
					<StatCard
						icon={<TriangleAlert className="w-4 h-4 min-w-4 min-h-4" />}
						iconWrapperClassName="bg-red-200 text-red-600"
						label="TRANSAÇÕES EM ATRASO"
						value={
							<div className="flex items-center gap-2">
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-red-200 text-red-600")}>
									<MoveUp className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactionsOverdue.outflow || 0)}</h2>
								</div>
								<div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg bg-green-200 text-green-600")}>
									<MoveDown className="w-4 h-4 min-w-4 min-h-4" />
									<h2 className="text-[0.65rem] font-medium">{formatToMoney(stats?.totalPendingTransactionsOverdue.inflow || 0)}</h2>
								</div>
							</div>
						}
					/>
				</div>
				<div
					className={"bg-card border-primary/20 flex w-full flex-col items-center justify-between gap-1 rounded-xl border px-3 py-4 shadow-xs lg:w-[60%]"}
				>
					<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
						<div className="flex items-center justify-start gap-2">
							<ChartNoAxesColumnIncreasing className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="text-xs font-medium leading-none tracking-tight">FLUXO DE TRANSAÇÕES</h1>
						</div>
					</div>

					<div className="w-full grow">
						<TransactionsGraph daily={stats?.daily || []} />
					</div>
				</div>
			</div>
		</div>
	);
}

type TransactionsGraphProps = {
	daily: TGetFinancesOverallStatsOutput["data"]["daily"];
};
function TransactionsGraph({ daily }: TransactionsGraphProps) {
	console.log(daily);
	const chartConfig = {
		effective: {
			label: "EFETIVADO",
			color: "#16a34a",
		},
		expected: {
			label: "EXPECTATIVA",
			color: "#ca8a04",
		},
	} satisfies ChartConfig;

	const allValues = daily.flatMap((item) => [item.expected, item.effective]);
	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
			<BarChart accessibilityLayer data={daily}>
				<CartesianGrid vertical={false} strokeWidth={0.2} />
				<YAxis domain={[minValue < 0 ? minValue * 1.1 : 0, maxValue * 1.1]} tickLine={false} tickMargin={10} />
				<XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 12)} />
				<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
				<Bar dataKey="effective" fill="var(--color-effective)" radius={4}>
					{daily.map((item) => (
						<Cell key={item.day} fill={item.effective > 0 ? "#16a34a" : "#dc2626 "} />
					))}
				</Bar>
				<Bar dataKey="expected" fill="var(--color-expected)" radius={4}>
					{daily.map((item) => (
						<Cell key={item.day} fill={item.expected > 0 ? "#ca8a04" : "#dc2626 "} />
					))}
				</Bar>
				<ChartLegend content={<ChartLegendContent payload={daily} />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
			</BarChart>
		</ChartContainer>
	);
}

// ============================================================================
// ACCOUNTING ENTRIES VIEW
// ============================================================================

function FinancesAccountingEntriesView() {
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFinancesAccountingEntries({
		initialFilters: { page: 1, search: "" },
	});

	const entries = data?.entries ?? [];
	const entriesMatched = data?.entriesMatched ?? 0;
	const totalPages = data?.totalPages ?? 0;

	const selectedOriginTypesLabel = useMemo(
		() => filters.originTypes?.map((originType) => AccountingEntryOriginTypeOptions.find((o) => o.value === originType)?.label ?? originType) ?? [],
		[filters.originTypes],
	).join(", ");
	const selectedCompetencePeriodLabel = useMemo(() => {
		return filters.periodAfter && filters.periodBefore
			? `${formatDateAsLocale(filters.periodAfter)} - ${formatDateAsLocale(filters.periodBefore)}`
			: "N/A";
	}, [filters.periodAfter, filters.periodBefore]);
	return (
		<div className="flex w-full flex-col gap-3">
			<Input
				value={filters.search ?? ""}
				placeholder="Pesquisar lançamento..."
				onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
				className="grow rounded-xl"
			/>
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end justify-end">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<ListFilter className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>TIPO DE ORIGEM</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{selectedOriginTypesLabel.length > 0 ? <strong>{selectedOriginTypesLabel}</strong> : <span>NENHUM</span>}
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ originTypes: [] })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-72 p-0">
						<InteractiveFilter.MultiContent
							options={AccountingEntryOriginTypeOptions.map((o) => ({
								...o,
								startContent: o.icon,
							}))}
							value={filters.originTypes ?? []}
							onChange={(nextOriginTypes) => updateFilters({ originTypes: nextOriginTypes })}
							onClear={() => updateFilters({ originTypes: [] })}
							isCleared={filters.originTypes?.length === 0}
							searchPlaceholder="Buscar tipo de origem..."
							emptyLabel="Nenhum tipo de origem encontrado."
							clearLabel="N/A"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<CalendarDays className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>PERÍODO DE COMPETÊNCIA</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{selectedCompetencePeriodLabel}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ periodAfter: null, periodBefore: null, page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-auto p-0">
						<InteractiveFilter.DateRangeContent
							value={{ from: filters.periodAfter ?? undefined, to: filters.periodBefore ?? undefined }}
							onChange={(nextPeriod) =>
								updateFilters({
									periodAfter: nextPeriod.from ?? filters.periodAfter ?? undefined,
									periodBefore: nextPeriod.to ?? filters.periodBefore ?? undefined,
									page: 1,
								})
							}
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			</div>

			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages}
				itemsMatchedText={`${entriesMatched} ${entriesMatched === 1 ? "lançamento encontrado" : "lançamentos encontrados"}.`}
				itemsShowingText={`Mostrando ${entries.length} ${entries.length === 1 ? "lançamento" : "lançamentos"}.`}
			/>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && entries ? (
				entries.length > 0 ? (
					entries.map((entry) => <AccountingEntryCard key={entry.id} entry={entry} />)
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<BookOpen />
							</EmptyMedia>
							<EmptyTitle>Nenhum lançamento encontrado</EmptyTitle>
							<EmptyDescription>Não há lançamentos contábeis para os filtros selecionados.</EmptyDescription>
						</EmptyHeader>
						<EmptyContent />
					</Empty>
				)
			) : null}
		</div>
	);
}

type AccountingEntryCardProps = {
	entry: TGetAccountingEntriesOutputDefault["entries"][number];
};
function AccountingEntryCard({ entry }: AccountingEntryCardProps) {
	const originTypeBadge = {
		VENDA: { label: "Venda", className: "bg-blue-100 text-blue-700" },
		MANUAL: { label: "Manual", className: "bg-gray-100 text-gray-700" },
		ESTORNO: { label: "Estorno", className: "bg-orange-100 text-orange-700" },
	}[entry.origemTipo] ?? { label: entry.origemTipo, className: "bg-gray-100 text-gray-700" };

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1.5 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex items-center gap-2">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{entry.titulo || "TÍTULO NÃO DEFINIDO"}</h1>
					<span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.65rem] font-medium", originTypeBadge.className)}>
						{originTypeBadge.label}
					</span>
				</div>
				<span className="text-sm font-semibold">{formatToMoney(entry.valor)}</span>
			</div>

			<div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
				<span className="font-medium">{entry.contaDebito?.nome ?? "—"}</span>
				<ArrowRight className="w-3 h-3 min-w-3 min-h-3" />
				<span className="font-medium">{entry.contaCredito?.nome ?? "—"}</span>
			</div>

			{entry.anotacoes ? <p className="text-[0.65rem] text-muted-foreground line-clamp-1">{entry.anotacoes}</p> : null}

			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-1">
						<span className="text-[0.65rem] text-muted-foreground">Competência: {formatDateAsLocale(entry.dataCompetencia)}</span>
					</div>
					{entry.autor ? (
						<div className="flex items-center gap-1">
							<Avatar className="h-4 w-4">
								<AvatarImage src={entry.autor.avatarUrl || undefined} alt={entry.autor.nome || "N/A"} />
								<AvatarFallback className="text-[0.5rem]">{formatNameAsInitials(entry.autor.nome || "N/A")}</AvatarFallback>
							</Avatar>
							<span className="text-[0.65rem] text-muted-foreground">{entry.autor.nome}</span>
						</div>
					) : null}
					<span className="text-[0.65rem] text-muted-foreground">{formatDateAsLocale(entry.dataInsercao, true)}</span>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// FINANCIAL TRANSACTIONS VIEW
// ============================================================================



const TRANSACTION_STATUS_OPTIONS = [
	{ id: "pendente", value: "pendente", label: "Pendente", icon: <Clock className="w-4 h-4 text-blue-600" /> },
	{ id: "efetivada", value: "efetivada", label: "Efetivada", icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
	{ id: "em-atraso", value: "em-atraso", label: "Em Atraso", icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
];

const PAYMENT_METHOD_LABELS = Object.fromEntries(SalePaymentMethodsOptions.map((option) => [option.value, option.label])) as Record<string, string>;



function FinancesTransactionsView() {
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFinancesTransactions({
		initialFilters: { page: 1, search: "" },
	});

	const transactions = data?.transactions ?? [];
	const transactionsMatched = data?.transactionsMatched ?? 0;
	const totalPages = data?.totalPages ?? 0;
	const selectedTypesLabel = useMemo(
		() => filters.types.map((type) => FinancialTransactionTypeOptions.find((option) => option.value === type)?.label ?? type).join(", "),
		[filters.types],
	);
	const selectedPaymentMethodsLabel = useMemo(
		() => filters.paymentMethods.map((method) => SalePaymentMethodsOptions.find((option) => option.value === method)?.label ?? method).join(", "),
		[filters.paymentMethods],
	);
	const selectedStatusesLabel = useMemo(
		() => filters.statuses.map((status) => TRANSACTION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status).join(", "),
		[filters.statuses],
	);
	const selectedForecastPeriodLabel = useMemo(() => {
		return filters.periodAfter && filters.periodBefore
			? `${formatDateAsLocale(filters.periodAfter)} - ${formatDateAsLocale(filters.periodBefore)}`
			: "N/A";
	}, [filters.periodAfter, filters.periodBefore]);

	return (
		<div className="flex w-full flex-col gap-3">
			<Input
				value={filters.search}
				placeholder="Pesquisar movimentação..."
				onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
				className="grow rounded-xl"
			/>
			<div className="flex flex-col gap-3 justify-end lg:flex-row lg:items-end">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<ArrowRight className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>TIPO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{selectedTypesLabel.length > 0 ? <strong>{selectedTypesLabel}</strong> : <span>NENHUM</span>}
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ types: [], page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-72 p-0">
						<InteractiveFilter.MultiContent
							options={FinancialTransactionTypeOptions.map((option) => ({
								...option,
								startContent: option.icon,
							}))}
							value={filters.types}
							onChange={(nextTypes) => updateFilters({ types: nextTypes, page: 1 })}
							onClear={() => updateFilters({ types: [], page: 1 })}
							isCleared={filters.types.length === 0}
							searchPlaceholder="Buscar tipo..."
							emptyLabel="Nenhum tipo encontrado."
							clearLabel="N/A"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<Wallet className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>MÉTODO DE PAGAMENTO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{selectedPaymentMethodsLabel.length > 0 ? <strong>{selectedPaymentMethodsLabel}</strong> : <span>NENHUM</span>}
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ paymentMethods: [], page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-80 p-0">
						<InteractiveFilter.MultiContent
							options={SalePaymentMethodsOptions.map((option) => ({
								...option,
								startContent: option.icon,
							}))}
							value={filters.paymentMethods}
							onChange={(nextPaymentMethods) => updateFilters({ paymentMethods: nextPaymentMethods, page: 1 })}
							onClear={() => updateFilters({ paymentMethods: [], page: 1 })}
							isCleared={filters.paymentMethods.length === 0}
							searchPlaceholder="Buscar método..."
							emptyLabel="Nenhum método encontrado."
							clearLabel="N/A"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<ListFilter className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>STATUS</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{selectedStatusesLabel.length > 0 ? <strong>{selectedStatusesLabel}</strong> : <span>NENHUM</span>}
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ statuses: [], page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-72 p-0">
						<InteractiveFilter.MultiContent
							options={TRANSACTION_STATUS_OPTIONS.map((option) => ({
								...option,
								startContent: option.icon,
							}))}
							value={filters.statuses}
							onChange={(nextStatuses) => updateFilters({ statuses: nextStatuses, page: 1 })}
							onClear={() => updateFilters({ statuses: [], page: 1 })}
							isCleared={filters.statuses.length === 0}
							searchPlaceholder="Buscar status..."
							emptyLabel="Nenhum status encontrado."
							clearLabel="N/A"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<CalendarDays className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>PERÍODO DE PREVISÃO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{selectedForecastPeriodLabel}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ periodAfter: null, periodBefore: null, page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-auto p-0">
						<InteractiveFilter.DateRangeContent
							value={{ from: filters.periodAfter ?? undefined, to: filters.periodBefore ?? undefined }}
							onChange={(nextPeriod) =>
								updateFilters({
									periodAfter: nextPeriod.from ?? null,
									periodBefore: nextPeriod.to ?? null,
									page: 1,
								})
							}
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			</div>

			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages}
				itemsMatchedText={`${transactionsMatched} ${transactionsMatched === 1 ? "movimentação encontrada" : "movimentações encontradas"}.`}
				itemsShowingText={`Mostrando ${transactions.length} ${transactions.length === 1 ? "movimentação" : "movimentações"}.`}
			/>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && transactions ? (
				transactions.length > 0 ? (
					transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<DollarSign />
							</EmptyMedia>
							<EmptyTitle>Nenhuma movimentação encontrada</EmptyTitle>
							<EmptyDescription>Não há movimentações financeiras para os filtros selecionados.</EmptyDescription>
						</EmptyHeader>
						<EmptyContent />
					</Empty>
				)
			) : null}
		</div>
	);
}

type TransactionCardProps = {
	transaction: TGetFinancialTransactionsOutputDefault["transactions"][number];
};
function TransactionCard({ transaction }: TransactionCardProps) {
	const typeBadge =
		transaction.tipo === "ENTRADA"
			? { label: "Entrada", className: "bg-green-100 text-green-700", icon: <MoveDown className="w-3 h-3" /> }
			: { label: "Saída", className: "bg-red-100 text-red-700", icon: <MoveUp className="w-3 h-3" /> };

	const now = new Date();
	const isEffective = !!transaction.dataEfetivacao;
	const isOverdue = !isEffective && transaction.dataPrevisao && new Date(transaction.dataPrevisao) < now;

	const statusBadge = isEffective
		? { label: "Efetivada", className: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> }
		: isOverdue
			? { label: "Em Atraso", className: "bg-red-100 text-red-700", icon: <AlertCircle className="w-3 h-3" /> }
			: { label: "Pendente", className: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> };

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1.5 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{transaction.titulo || "TÍTULO NÃO DEFINIDO"}</h1>
					<span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.65rem] font-medium", typeBadge.className)}>
						{typeBadge.icon}
						{typeBadge.label}
					</span>
					<span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.65rem] font-medium", statusBadge.className)}>
						{statusBadge.icon}
						{statusBadge.label}
					</span>
				</div>
				<span className="text-sm font-semibold">{formatToMoney(transaction.valor)}</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{transaction.metodo ? (
					<span className="px-2 py-0.5 rounded-lg bg-secondary text-[0.65rem] font-medium">
						{PAYMENT_METHOD_LABELS[transaction.metodo] ?? transaction.metodo}
					</span>
				) : null}
				{transaction.contaFinanceira ? <span className="text-[0.65rem] text-muted-foreground">{transaction.contaFinanceira.nome}</span> : null}
				{transaction.totalParcelas && transaction.totalParcelas > 1 ? (
					<span className="text-[0.65rem] text-muted-foreground">
						Parcela {transaction.parcela}/{transaction.totalParcelas}
					</span>
				) : null}
			</div>

			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[0.65rem] text-muted-foreground">Previsão: {formatDateAsLocale(transaction.dataPrevisao)}</span>
					{transaction.dataEfetivacao ? (
						<span className="text-[0.65rem] text-muted-foreground">Efetivação: {formatDateAsLocale(transaction.dataEfetivacao)}</span>
					) : null}
					{transaction.autor ? (
						<div className="flex items-center gap-1">
							<Avatar className="h-4 w-4">
								<AvatarImage src={transaction.autor.avatarUrl || undefined} alt={transaction.autor.nome || "N/A"} />
								<AvatarFallback className="text-[0.5rem]">{formatNameAsInitials(transaction.autor.nome || "N/A")}</AvatarFallback>
							</Avatar>
							<span className="text-[0.65rem] text-muted-foreground">{transaction.autor.nome}</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// FINANCIAL ACCOUNTS VIEW
// ============================================================================

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; className: string }> = {
	CAIXA: { label: "Caixa", className: "bg-green-100 text-green-700" },
	BANCO: { label: "Banco", className: "bg-blue-100 text-blue-700" },
	CARTEIRA_DIGITAL: { label: "Carteira Digital", className: "bg-purple-100 text-purple-700" },
};

function FinancesAccountsView() {
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFinancesAccounts({ initialFilters: {} });
	const accounts = data?.accounts ?? [];

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center gap-2">
				<Button
					variant={filters.activeOnly ? "default" : "outline"}
					size="sm"
					onClick={() => updateFilters({ activeOnly: !filters.activeOnly })}
					className="text-xs"
				>
					{filters.activeOnly ? "Somente ativas" : "Todas as contas"}
				</Button>
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && accounts ? (
				accounts.length > 0 ? (
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
						{accounts.map((account) => (
							<AccountCard key={account.id} account={account} />
						))}
					</div>
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Banknote />
							</EmptyMedia>
							<EmptyTitle>Nenhuma conta financeira encontrada</EmptyTitle>
							<EmptyDescription>{filters.activeOnly ? "Não há contas financeiras ativas." : "Não há contas financeiras cadastradas."}</EmptyDescription>
						</EmptyHeader>
						<EmptyContent />
					</Empty>
				)
			) : null}
		</div>
	);
}

type AccountCardProps = {
	account: TGetFinancialAccountsOutputDefault["accounts"][number];
};
function AccountCard({ account }: AccountCardProps) {
	const typeBadge = ACCOUNT_TYPE_LABELS[account.tipo] ?? { label: account.tipo, className: "bg-gray-100 text-gray-700" };

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-4 py-4 shadow-2xs">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"flex h-7 w-7 p-1 items-center justify-center rounded-full",
							account.tipo === "BANCO"
								? "bg-blue-200 text-blue-700"
								: account.tipo === "CARTEIRA_DIGITAL"
									? "bg-purple-200 text-purple-700"
									: "bg-green-200 text-green-700",
						)}
					>
						{account.tipo === "BANCO" ? (
							<Building2 className="w-4 h-4" />
						) : account.tipo === "CARTEIRA_DIGITAL" ? (
							<Wallet className="w-4 h-4" />
						) : (
							<Banknote className="w-4 h-4" />
						)}
					</div>
					<div>
						<h2 className="text-sm font-semibold">{account.nome}</h2>
						<span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg text-[0.65rem] font-medium mt-0.5", typeBadge.className)}>
							{typeBadge.label}
						</span>
					</div>
				</div>
				<span
					className={cn("text-[0.65rem] font-medium px-2 py-0.5 rounded-lg", account.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}
				>
					{account.ativo ? "Ativa" : "Inativa"}
				</span>
			</div>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-[0.65rem] text-muted-foreground">Saldo inicial</span>
					<span className="text-xs font-medium">{formatToMoney(account.saldoInicial)}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[0.65rem] text-muted-foreground">Data do saldo</span>
					<span className="text-[0.65rem] text-muted-foreground">{formatDateAsLocale(account.dataSaldoInicial)}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[0.65rem] text-muted-foreground">Moeda</span>
					<span className="text-[0.65rem] font-medium">{account.moeda}</span>
				</div>
			</div>

			{account.tipo === "BANCO" && (account.nomeBanco || account.agencia || account.numeroConta) ? (
				<div className="flex flex-col gap-1 border-t border-primary/10 pt-2">
					{account.nomeBanco ? (
						<div className="flex items-center justify-between">
							<span className="text-[0.65rem] text-muted-foreground">Banco</span>
							<span className="text-[0.65rem] font-medium">{account.nomeBanco}</span>
						</div>
					) : null}
					{account.agencia ? (
						<div className="flex items-center justify-between">
							<span className="text-[0.65rem] text-muted-foreground">Agência</span>
							<span className="text-[0.65rem] font-medium">{account.agencia}</span>
						</div>
					) : null}
					{account.numeroConta ? (
						<div className="flex items-center justify-between">
							<span className="text-[0.65rem] text-muted-foreground">Conta</span>
							<span className="text-[0.65rem] font-medium">
								{account.numeroConta}
								{account.digitoConta ? `-${account.digitoConta}` : ""}
							</span>
						</div>
					) : null}
				</div>
			) : null}

			{account.contaContabil ? (
				<div className="flex items-center justify-between border-t border-primary/10 pt-2">
					<span className="text-[0.65rem] text-muted-foreground">Conta contábil</span>
					<span className="text-[0.65rem] font-medium">{account.contaContabil.nome}</span>
				</div>
			) : null}
		</div>
	);
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

type StatCardProps = {
	className?: string;
	icon: React.ReactNode;
	iconWrapperClassName?: string;
	label: string;
	value: string | number | React.ReactNode;
};

export function StatCard({ className, icon, iconWrapperClassName, label, value }: StatCardProps) {
	return (
		<div
			className={cn(
				"bg-card border-primary/20 flex w-full flex-row items-center justify-between gap-1 rounded-xl border px-3 py-4 shadow-xs",
				className,
			)}
		>
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex items-center justify-start gap-2">
					<div className={cn("flex h-7 w-7 p-1 items-center justify-center rounded-full", iconWrapperClassName)}>{icon}</div>
					<h1 className="text-xs font-medium leading-none tracking-tight">{label}</h1>
				</div>
				{typeof value === "string" || typeof value === "number" ? <h1 className="text-sm font-medium">{value}</h1> : <div>{value}</div>}
			</div>
		</div>
	);
}
