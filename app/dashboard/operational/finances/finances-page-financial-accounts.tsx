"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	BadgeDollarSign,
	Banknote,
	GitBranch,
	PlayIcon,
	TrendingUp,
	CalendarDays,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { TGetFinancialAccountsOutputDefault } from "@/app/api/finances/financial-accounts/route";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { getErrorMessage } from "@/lib/errors";
import { useFinancesAccounts, useFinancialAccountGraph } from "@/lib/queries/finances";
import { cn } from "@/lib/utils";
import { FinancialAccountTypeOptions } from "@/utils/select-options";

const ACCOUNT_STATUS_OPTIONS = [
	{ id: "active", value: "true", label: "Somente ativas" },
	{ id: "all", value: "false", label: "Todas as contas" },
];

export default function FinancesAccountsView() {
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
		<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-4 py-4 shadow-2xs">
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
				<div className="flex flex-col gap-1 border-t border-border pt-2">
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

const GRAPH_TYPE_OPTIONS: { value: AccountCardGraphType; icon: ReactNode; label: string }[] = [
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
			<span className="text-[0.55rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{GRAPH_TYPE_LABELS[graphType]}</span>
			<div className="flex items-center gap-0.5">
				{GRAPH_TYPE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						title={opt.label}
						onClick={() => setGraphType(opt.value)}
						className={cn(
							"flex h-5 w-5 items-center justify-center rounded-md transition-colors",
							graphType === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
				<AreaChart accessibilityLayer data={graphType === "consolidated" ? consolidatedData : data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
						<Area
							type="monotone"
							dataKey="entries"
							stroke="#16a34a"
							strokeWidth={1.5}
							fill={`url(#grad-entries-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
					{(graphType === "entries-and-exits" || graphType === "exits") && (
						<Area
							type="monotone"
							dataKey="exits"
							stroke="#dc2626"
							strokeWidth={1.5}
							fill={`url(#grad-exits-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
					{graphType === "consolidated" && (
						<Area
							type="monotone"
							dataKey="net"
							stroke="#6366f1"
							strokeWidth={1.5}
							fill={`url(#grad-net-${accountId})`}
							dot={false}
							activeDot={{ r: 3, strokeWidth: 0 }}
						/>
					)}
				</AreaChart>
			</ChartContainer>
		</div>
	);
}
