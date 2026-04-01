"use client";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { effectFinancialTransaction } from "@/lib/mutations/finances";
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
	PlayIcon,
	GitBranch,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatToMoney, formatDateAsLocale, formatNameAsInitials } from "@/lib/formatting";
import { AnimatePresence, motion } from "framer-motion";
import { SlideMotionVariants } from "@/lib/animations";
import { useMemo, useState } from "react";
import {
	useFinancesOverallStats,
	useFinancesAccountingEntries,
	useFinancesTransactions,
	useFinancesAccounts,
	useFinancialAccountGraph,
} from "@/lib/queries/finances";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TGetFinancesOverallStatsOutput } from "@/app/api/finances/stats/route";
import { TGetAccountingEntriesOutputDefault } from "@/app/api/finances/accounting-entries/route";
import { TGetFinancialTransactionsOutputDefault } from "@/app/api/finances/financial-transactions/route";
import { TGetFinancialAccountsOutputDefault } from "@/app/api/finances/financial-accounts/route";
import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getErrorMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import DateInput from "@/components/Inputs/DateInput";
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import {
	AccountingEntryOriginTypeOptions,
	FinancialAccountTypeOptions,
	FinancialTransactionTypeOptions,
	SalePaymentMethodsOptions,
} from "@/utils/select-options";
import { BsCalendar, BsCalendarCheck } from "react-icons/bs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
	const originTypeConfig = useMemo(() => AccountingEntryOriginTypeOptions.find((o) => o.value === entry.origemTipo) ?? null, [entry.origemTipo]);
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1.5 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex items-center gap-2">
					{originTypeConfig ? (
						<span
							className={cn(
								"flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]",
								originTypeConfig.colors.background,
								originTypeConfig.colors.text,
							)}
						>
							{originTypeConfig.icon}
							{originTypeConfig.label}
						</span>
					) : null}
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{entry.titulo || "TÍTULO NÃO DEFINIDO"}</h1>
				</div>
				<span className="text-sm font-semibold">{formatToMoney(entry.valor)}</span>
			</div>

			<div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
				<span className="font-medium">{entry.contaDebito?.nome ?? "—"}</span>
				<ArrowRight className="w-4 h-4 min-w-4 min-h-4" />
				<span className="font-medium">{entry.contaCredito?.nome ?? "—"}</span>
			</div>

			{entry.anotacoes ? <p className="text-[0.65rem] text-muted-foreground line-clamp-1">{entry.anotacoes}</p> : null}

			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex flex-wrap items-center gap-2">
					<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
						<BsCalendar className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium tracking-tight uppercase">COMPETÊNCIA: {formatDateAsLocale(entry.dataCompetencia)}</p>
					</div>
					{entry.autor ? (
						<div className="flex items-center gap-1.5">
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
	{ id: "pendente", value: "pendente", label: "PENDENTE", icon: <Clock className="w-4 h-4 text-blue-600" /> },
	{ id: "efetivada", value: "efetivada", label: "EFETIVADA", icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
	{ id: "em-atraso", value: "em-atraso", label: "EM ATRASO", icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
];

function FinancesTransactionsView() {
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFinancesTransactions({
		initialFilters: { page: 1, search: "" },
	});
	const { data: financialAccountsData } = useFinancesAccounts({ initialFilters: { activeOnly: true } });

	const transactions = data?.transactions ?? [];
	const financialAccounts = financialAccountsData?.accounts ?? [];
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
						<InteractiveFilter.Value>{selectedTypesLabel.length > 0 ? <strong>{selectedTypesLabel}</strong> : <span>NENHUM</span>}</InteractiveFilter.Value>
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
					transactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} financialAccounts={financialAccounts} />)
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
	financialAccounts: TGetFinancialAccountsOutputDefault["accounts"];
};
function TransactionCard({ transaction, financialAccounts }: TransactionCardProps) {
	const typeConfig = useMemo(() => FinancialTransactionTypeOptions.find((o) => o.value === transaction.tipo) ?? null, [transaction.tipo]);
	const queryClient = useQueryClient();
	const [isEffectFormOpen, setIsEffectFormOpen] = useState(false);
	const [effectDate, setEffectDate] = useState<string | undefined>(
		transaction.dataPrevisao ? new Date(transaction.dataPrevisao).toISOString().slice(0, 10) : undefined,
	);
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(transaction.contaFinanceira?.id ?? null);
	const [selectedMethod, setSelectedMethod] = useState(transaction.metodo === "A_DEFINIR" ? "DINHEIRO" : transaction.metodo);

	const now = new Date();
	const isEffective = !!transaction.dataEfetivacao;
	const isOverdue = !isEffective && transaction.dataPrevisao && new Date(transaction.dataPrevisao) < now;
	const statusConfig = useMemo(() => {
		return {
			label: isEffective ? "EFETIVADA" : isOverdue ? "EM ATRASO" : "PENDENTE",
			className: isEffective ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700",
			icon: isEffective ? <CheckCircle2 className="w-3 h-3" /> : isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />,
		};
	}, [isEffective, isOverdue]);

	const paymentMethodConfig = useMemo(() => {
		return SalePaymentMethodsOptions.find((o) => o.value === transaction.metodo) ?? null;
	}, [transaction.metodo]);

	const financialAccountTypeConfig = useMemo(() => {
		return FinancialAccountTypeOptions.find((o) => o.value === transaction.contaFinanceira?.tipo) ?? null;
	}, [transaction.contaFinanceira?.tipo]);
	const canChangeMethod = transaction.metodo === "A_DEFINIR";

	const { mutate: mutateEffectTransaction, isPending: isEffecting } = useMutation({
		mutationFn: effectFinancialTransaction,
		onSuccess: (data) => {
			toast.success(data.message);
			setIsEffectFormOpen(false);
			void queryClient.invalidateQueries({ queryKey: ["finances-financial-transactions"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1.5 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex items-center gap-2 flex-wrap">
					{typeConfig ? (
						<span className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]", typeConfig.colors.background, typeConfig.colors.text)}>
							{typeConfig.icon}
							{typeConfig.label}
						</span>
					) : null}
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{transaction.titulo || "TÍTULO NÃO DEFINIDO"}</h1>
				</div>
				<div className="flex items-center gap-1.5">
					{statusConfig ? (
						<span className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]", statusConfig.className)}>
							{statusConfig.icon}
							{statusConfig.label}
						</span>
					) : null}
					<span className="text-sm font-semibold">{formatToMoney(transaction.valor)}</span>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{transaction.contaFinanceira ? (
					<span className={cn("flex items-center gap-1.5 text-[0.65rem]")}>
						{financialAccountTypeConfig?.icon}
						{transaction.contaFinanceira.nome}
					</span>
				) : null}
				{paymentMethodConfig ? (
					<span className={cn("flex items-center gap-1.5 text-[0.65rem]")}>
						{paymentMethodConfig.icon}
						{paymentMethodConfig.label}
					</span>
				) : null}

				{transaction.totalParcelas && transaction.totalParcelas > 1 ? (
					<span className="text-[0.65rem] text-muted-foreground">
						Parcela {transaction.parcela}/{transaction.totalParcelas}
					</span>
				) : null}
			</div>

			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex flex-wrap items-center gap-2">
					{transaction.dataEfetivacao ? (
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<BsCalendarCheck className="w-3 min-w-3 h-3 min-h-3 text-green-600" />
							<p className="text-xs font-medium tracking-tight uppercase">EFETIVADA: {formatDateAsLocale(transaction.dataEfetivacao)}</p>
						</div>
					) : transaction.dataPrevisao ? (
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<BsCalendar className="w-3 min-w-3 h-3 min-h-3 text-amber-600" />
							<p className="text-xs font-medium tracking-tight uppercase">PREVISÃO: {formatDateAsLocale(transaction.dataPrevisao)}</p>
						</div>
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
				{!isEffective ? (
					<Button type="button" size="sm" variant={isEffectFormOpen ? "default" : "outline"} onClick={() => setIsEffectFormOpen((prev) => !prev)}>
						Efetivar
					</Button>
				) : null}
			</div>

			{!isEffective && isEffectFormOpen ? (
				<div className="mt-2 grid gap-3 rounded-xl border border-primary/10 bg-background/70 p-3 md:grid-cols-3">
					<DateInput label="Data de efetivação" value={effectDate} handleChange={setEffectDate} />
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-medium uppercase text-muted-foreground">Conta financeira</span>
						<select
							className="h-10 rounded-md border border-input bg-background px-3 text-sm"
							value={selectedAccountId ?? ""}
							onChange={(event) => setSelectedAccountId(event.target.value || null)}
						>
							<option value="">Sem conta</option>
							{financialAccounts.map((account) => (
								<option key={account.id} value={account.id}>
									{account.nome}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-medium uppercase text-muted-foreground">Método final</span>
						<select
							className="h-10 rounded-md border border-input bg-background px-3 text-sm"
							value={selectedMethod}
							onChange={(event) => setSelectedMethod(event.target.value as typeof selectedMethod)}
							disabled={!canChangeMethod}
						>
							{SalePaymentMethodsOptions.filter((option) => option.value !== "A_DEFINIR").map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div className="md:col-span-3 flex justify-end">
						<Button
							type="button"
							onClick={() =>
								mutateEffectTransaction({
									transactionId: transaction.id,
									dataEfetivacao: effectDate ?? null,
									contaFinanceiraId: selectedAccountId,
									metodo: canChangeMethod ? selectedMethod : null,
								})
							}
							disabled={isEffecting}
						>
							{isEffecting ? "Efetivando..." : "Confirmar efetivação"}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}

// ============================================================================
// FINANCIAL ACCOUNTS VIEW
// ============================================================================

const ACCOUNT_STATUS_OPTIONS = [
	{ id: "active", value: "true", label: "Somente ativas" },
	{ id: "all", value: "false", label: "Todas as contas" },
];

function FinancesAccountsView() {
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFinancesAccounts({ initialFilters: {} });
	const accounts = data?.accounts ?? [];

	const selectedStatusLabel = filters.activeOnly ? "SOMENTE ATIVAS" : "TODAS AS CONTAS";
	const selectedPeriodLabel = useMemo(() => {
		return filters.statsPeriodAfter && filters.statsPeriodBefore
			? `${formatDateAsLocale(filters.statsPeriodAfter)} - ${formatDateAsLocale(filters.statsPeriodBefore)}`
			: "N/A";
	}, [filters.statsPeriodAfter, filters.statsPeriodBefore]);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-3 justify-end lg:flex-row lg:items-end">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<Banknote className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>STATUS</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							<strong>{selectedStatusLabel}</strong>
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ activeOnly: true })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-56 p-0">
						<InteractiveFilter.SingleContent
							options={ACCOUNT_STATUS_OPTIONS}
							value={filters.activeOnly ? "true" : "false"}
							onChange={(nextValue) => updateFilters({ activeOnly: nextValue === "true" })}
							searchPlaceholder="Buscar status..."
							emptyLabel="Nenhum status encontrado."
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<CalendarDays className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>PERÍODO DE ESTATÍSTICAS</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{selectedPeriodLabel}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ statsPeriodAfter: null, statsPeriodBefore: null })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-auto p-0">
						<InteractiveFilter.DateRangeContent
							value={{ from: filters.statsPeriodAfter ?? undefined, to: filters.statsPeriodBefore ?? undefined }}
							onChange={(nextPeriod) =>
								updateFilters({
									statsPeriodAfter: nextPeriod.from ?? filters.statsPeriodAfter ?? null,
									statsPeriodBefore: nextPeriod.to ?? filters.statsPeriodBefore ?? null,
								})
							}
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && accounts ? (
				accounts.length > 0 ? (
					<div className="w-full flex flex-col gap-3">
						{accounts.map((account) => (
							<AccountCard key={account.id} account={account} statsPeriodAfter={filters.statsPeriodAfter} statsPeriodBefore={filters.statsPeriodBefore} />
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
	statsPeriodAfter: Date | null;
	statsPeriodBefore: Date | null;
};
function AccountCard({ account, statsPeriodAfter, statsPeriodBefore }: AccountCardProps) {
	const typeConfig = FinancialAccountTypeOptions.find((o) => o.value === account.tipo) ?? null;
	const stats = account.estatisticas;

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-4 py-4 shadow-2xs">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					{typeConfig ? (
						<span className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]", typeConfig.colors.background, typeConfig.colors.text)}>
							{typeConfig.icon}
							{typeConfig.label}
						</span>
					) : null}

					<h2 className="text-sm font-semibold">{account.nome}</h2>
				</div>
				<span
					className={cn(
						"flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]",
						account.ativo ? "bg-green-200 text-green-600" : "bg-gray-200 text-gray-600",
					)}
				>
					{account.ativo ? "ATIVO" : "INATIVO"}
				</span>
			</div>
			<div className="w-full flex items-center flex-wrap gap-x-3 gap-y-1.5">
				<span className={cn("flex items-center gap-1.5 text-[0.65rem]")}>
					<PlayIcon className="w-3 h-3" />
					INICIAL: {formatToMoney(account.saldoInicial)} EM {formatDateAsLocale(account.dataSaldoInicial)}
				</span>
				<span className={cn("flex items-center gap-1.5 text-[0.65rem]")}>
					<GitBranch className="w-3 h-3" />
					CONTA CONTÁBIL: {account.contaContabil?.nome ?? "N/A"}
				</span>
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
			<div className="flex w-full flex-col gap-2 lg:flex-row lg:items-stretch">
				{/* LEFT: Stat badges stacked vertically */}
				<div className="flex w-full shrink-0 flex-col gap-1 lg:w-1/3">
					{/* Saldo Atual — all time */}
					<div className={cn("w-full flex items-center justify-between gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-secondary")}>
						<div className="flex items-center gap-1.5">
							<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
							<span className="text-xs font-medium">SALDO ATUAL</span>
						</div>
						<span className="text-sm font-bold tabular-nums">{formatToMoney(stats?.saldoAtual ?? 0)}</span>
					</div>

					{/* Total Entradas — period */}
					<div className="w-full flex items-center justify-between gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-green-100 text-green-700">
						<div className="flex items-center gap-1.5">
							<ArrowUp className="w-4 h-4 min-w-4 min-h-4" />
							<span className="text-xs font-medium">ENTRADAS</span>
						</div>
						<span className="text-sm font-bold tabular-nums">{formatToMoney(stats?.totalEntradas ?? 0)}</span>
					</div>

					{/* Total Saídas — period */}
					<div className="w-full flex items-center justify-between gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-red-100 text-red-700">
						<div className="flex items-center gap-1.5">
							<ArrowDown className="w-4 h-4 min-w-4 min-h-4" />
							<span className="text-xs font-medium">SAÍDAS</span>
						</div>
						<span className="text-sm font-bold tabular-nums">{formatToMoney(stats?.totalSaidas ?? 0)}</span>
					</div>
				</div>

				{/* RIGHT: chart — owns its own header + type toggles */}
				<div className="flex min-h-[120px] flex-1 flex-col rounded-[10px] bg-gradient-to-b from-muted/40 to-transparent px-2 pb-1 pt-2">
					<AccountCardChart accountId={account.id} startDate={statsPeriodAfter} endDate={statsPeriodBefore} />
				</div>
			</div>
		</div>
	);
}

type AccountCardGraphType = "entries-and-exits" | "entries" | "exits" | "consolidated";

const GRAPH_TYPE_OPTIONS: { value: AccountCardGraphType; icon: React.ReactNode; label: string }[] = [
	{ value: "entries-and-exits", icon: <ArrowUpDown className="h-3 w-3" />, label: "Entradas e Saídas" },
	{ value: "entries", icon: <ArrowUp className="h-3 w-3" />, label: "Entradas" },
	{ value: "exits", icon: <ArrowDown className="h-3 w-3" />, label: "Saídas" },
	{ value: "consolidated", icon: <TrendingUp className="h-3 w-3" />, label: "Resultado líquido" },
];

const GRAPH_TYPE_LABELS: Record<AccountCardGraphType, string> = {
	"entries-and-exits": "Entradas vs Saídas",
	entries: "Entradas",
	exits: "Saídas",
	consolidated: "Resultado líquido",
};

type AccountCardChartProps = {
	accountId: string;
	startDate: Date | null;
	endDate: Date | null;
};
function AccountCardChart({ accountId, startDate, endDate }: AccountCardChartProps) {
	const [graphType, setGraphType] = useState<AccountCardGraphType>("entries-and-exits");
	const { data, isLoading } = useFinancialAccountGraph({ contaFinanceiraId: accountId, startDate, endDate });

	const consolidatedData = useMemo(() => data?.map((d) => ({ ...d, net: d.entries - d.exits })) ?? [], [data]);

	const chartConfig = {
		entries: { label: "Entradas", color: "#16a34a" },
		exits: { label: "Saídas", color: "#dc2626" },
		net: { label: "Resultado", color: "#6366f1" },
	} satisfies ChartConfig;

	const header = (
		<div className="mb-1 flex items-center justify-between px-0.5">
			<span className="text-[0.55rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
				{GRAPH_TYPE_LABELS[graphType]}
			</span>
			<div className="flex items-center gap-0.5">
				{GRAPH_TYPE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						title={opt.label}
						onClick={() => setGraphType(opt.value)}
						className={cn(
							"flex h-5 w-5 items-center justify-center rounded-md transition-colors",
							graphType === opt.value
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{opt.icon}
					</button>
				))}
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<div className="flex w-full flex-col flex-1">
				{header}
				<div className="flex flex-1 items-center justify-center">
					<span className="text-[0.6rem] text-muted-foreground animate-pulse">Carregando...</span>
				</div>
			</div>
		);
	}

	const hasAnyData = data && data.some((d) => d.entries > 0 || d.exits > 0);
	if (!data || !hasAnyData) {
		return (
			<div className="flex w-full flex-col flex-1">
				{header}
				<div className="flex flex-1 items-center justify-center">
					<span className="text-[0.6rem] text-muted-foreground">Sem movimentações no período</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col flex-1">
			{header}
			<ChartContainer config={chartConfig} className="aspect-auto h-[88px] w-full">
				<AreaChart
					accessibilityLayer
					data={graphType === "consolidated" ? consolidatedData : data}
					margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
				>
					<defs>
						<linearGradient id={`grad-entries-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={`grad-exits-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
						</linearGradient>
						<linearGradient id={`grad-net-${accountId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
							<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} strokeWidth={0.2} />
					<XAxis dataKey="label" tickLine={false} tickMargin={4} axisLine={false} tick={{ fontSize: 8 }} tickFormatter={(v) => String(v).slice(0, 8)} />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								formatter={(value, name) => {
									const colorMap: Record<string, string> = { entries: "#16a34a", exits: "#dc2626", net: "#6366f1" };
									const labelMap: Record<string, string> = { entries: "Entradas", exits: "Saídas", net: "Resultado líquido" };
									const color = colorMap[name as string] ?? "#888";
									const label = labelMap[name as string] ?? String(name);
									return (
										<>
											<div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
											<div className="flex flex-1 items-center justify-between gap-3 leading-none">
												<span className="text-muted-foreground">{label}</span>
												<span className="font-mono font-medium tabular-nums text-foreground">{formatToMoney(Number(value))}</span>
											</div>
										</>
									);
								}}
							/>
						}
					/>

					{(graphType === "entries-and-exits" || graphType === "entries") && (
						<Area type="monotone" dataKey="entries" stroke="#16a34a" strokeWidth={1.5} fill={`url(#grad-entries-${accountId})`} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
					)}
					{(graphType === "entries-and-exits" || graphType === "exits") && (
						<Area type="monotone" dataKey="exits" stroke="#dc2626" strokeWidth={1.5} fill={`url(#grad-exits-${accountId})`} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
					)}
					{graphType === "consolidated" && (
						<Area type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={1.5} fill={`url(#grad-net-${accountId})`} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
					)}
				</AreaChart>
			</ChartContainer>
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
