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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatToMoney } from "@/lib/formatting";
import { AnimatePresence, motion } from "framer-motion";
import { SlideMotionVariants } from "@/lib/animations";
import { useState } from "react";
import { useFinancesOverallStats } from "@/lib/queries/finances";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TGetFinancesOverallStatsOutput } from "@/app/api/finances/stats/route";
import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
type FinancesPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function FinancesPage({ user, membership }: FinancesPageProps) {
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
					<TabsTrigger value="database" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<List className="w-4 h-4 min-w-4 min-h-4" />
						Lançamentos
					</TabsTrigger>
					<TabsTrigger value="interactions" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
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
				{/*<TabsContent value="database" className="flex flex-col gap-3">
					<CampaignsDatabaseView user={user} membership={membership} />
				</TabsContent>
				<TabsContent value="interactions" className="flex flex-col gap-3">
					<CampaignsInteractionsView />
				</TabsContent> */}
			</Tabs>
		</div>
	);
}

function FinancesStatsView() {
	const [showResultsByAccount, setShowResultsByAccount] = useState(false);
	const [showLiquidResultDetails, setShowLiquidResultDetails] = useState(false);
	const { data: stats } = useFinancesOverallStats({ initialParams: {} });

	const totalRevenue = stats?.totalRevenue || 0;
	const totalExpense = stats?.totalExpense || 0;
	const totalCost = stats?.totalCost || 0;
	return (
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
											delay: index * 0.1, // Each item is delayed by 0.1s * its index
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
											delay: index * 0.1, // Each item is delayed by 0.1s * its index
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

	// Encontrar o valor mínimo e máximo para definir o domínio do eixo Y
	const allValues = daily.flatMap((item) => [item.expected, item.effective]);
	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
			<BarChart accessibilityLayer data={daily}>
				<CartesianGrid vertical={false} strokeWidth={0.2} />
				<YAxis
					domain={[
						minValue < 0 ? minValue * 1.1 : 0, // Adiciona 10% de margem para valores negativos
						maxValue * 1.1, // Adiciona 10% de margem para valores positivos
					]}
					tickLine={false}
					tickMargin={10}
				/>
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
