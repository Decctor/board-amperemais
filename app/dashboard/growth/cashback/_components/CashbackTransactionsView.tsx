"use client";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import { formatInteractiveDateRangeSummary, formatInteractiveOptionSummary } from "@/components/ui/interactive-filter-formatting";
import { Input } from "@/components/ui/input";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { formatCashbackValue, formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useCashbackProgramTransactions } from "@/lib/queries/cashback-programs";
import { useSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Calendar, Gift, History, ListFilter, Search, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo } from "react";
import type {
	TGetCashbackProgramTransactionsInput,
	TGetCashbackProgramTransactionsOutputDefault,
} from "@/app/api/cashback-programs/transactions/route";
import Image from "next/image";

type TTransactionFilterType = TGetCashbackProgramTransactionsInput["types"][number];

const transactionTypeOptions: InteractiveFilterOption<TTransactionFilterType>[] = [
	{ id: "ACÚMULO", value: "ACÚMULO", label: "ACÚMULO", startContent: <TrendingUp className="h-4 w-4 text-green-600" /> },
	{ id: "RESGATE", value: "RESGATE", label: "RESGATE", startContent: <TrendingDown className="h-4 w-4 text-blue-600" /> },
	{ id: "EXPIRAÇÃO", value: "EXPIRAÇÃO", label: "EXPIRAÇÃO", startContent: <History className="h-4 w-4 text-red-600" /> },
];

export default function CashbackTransactionsView({ terminology }: { terminology: TCashbackProgramTerminologyEnum }) {
	const { data: sellersData } = useSellers({
		initialFilters: {
			page: 1,
			activeOnly: true,
			orderByField: "nome",
			orderByDirection: "asc",
		},
	});
	const sellerOptions: InteractiveFilterOption<string>[] = (sellersData?.sellers ?? []).map((seller) => ({
		id: seller.id,
		value: seller.id,
		label: seller.nome,
	}));
	const { data, isLoading, filters, updateFilters } = useCashbackProgramTransactions({
		initialFilters: {
			page: 1,
			limit: 20,
			periodAfter: dayjs().startOf("month").toDate(),
			periodBefore: dayjs().endOf("month").toDate(),
		},
	});

	const transactions = data?.transactions || [];
	const totalPages = data?.totalPages ?? 0;
	const transactionsMatched = data?.transactionsMatched ?? 0;
	const hasOperatorFilter = filters.operatorSellerIds.length > 0;
	const selectedTypesLabel = filters.types.map((type) => transactionTypeOptions.find((option) => option.value === type)?.label ?? type).join(", ");

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="relative w-full">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={filters.search}
					placeholder="Pesquisar por cliente, operador, prêmio ou produto..."
					onChange={(event) => updateFilters({ search: event.target.value, page: 1 })}
					className="w-full rounded-xl pl-9"
				/>
			</div>

			<div className="flex w-full flex-wrap items-center justify-end gap-2">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<ListFilter className="h-4 w-4" />
							<InteractiveFilter.Label>TIPO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{selectedTypesLabel ? <strong>{selectedTypesLabel}</strong> : <span>TODOS</span>}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ types: [], page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-72 p-0">
						<InteractiveFilter.MultiContent
							options={transactionTypeOptions}
							value={filters.types}
							onChange={(types) => updateFilters({ types, page: 1 })}
							onClear={() => updateFilters({ types: [], page: 1 })}
							isCleared={filters.types.length === 0}
							searchPlaceholder="Buscar tipo..."
							emptyLabel="Nenhum tipo encontrado."
							clearLabel="TODOS"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<Calendar className="h-4 w-4" />
							<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(filters.periodAfter, filters.periodBefore)}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ periodAfter: null, periodBefore: null, page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-auto p-0">
						<InteractiveFilter.DateRangeContent
							value={{ from: filters.periodAfter ?? undefined, to: filters.periodBefore ?? undefined }}
							onChange={(period) => updateFilters({ periodAfter: period.from ?? null, periodBefore: period.to ?? null, page: 1 })}
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>

				{hasOperatorFilter ? (
					<OperatorFilter
						options={sellerOptions}
						value={filters.operatorSellerIds}
						onChange={(operatorSellerIds) => updateFilters({ operatorSellerIds, page: 1 })}
					/>
				) : null}

				{!hasOperatorFilter ? (
					<InteractiveFilter.AddFilterRoot className="w-fit">
						<InteractiveFilter.AddFilterTrigger>
							<ListFilter className="h-4 w-4" />
							<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
						</InteractiveFilter.AddFilterTrigger>
						<InteractiveFilter.AddFilterContent>
							<InteractiveFilter.AddFilterSection heading="Filtros">
								<InteractiveFilter.AddFilterItem id="operatorSellerIds" label="OPERADORES" icon={<UserRound className="h-4 w-4" />}>
									<InteractiveFilter.MultiContent
										options={sellerOptions}
										value={filters.operatorSellerIds}
										onChange={(operatorSellerIds) => updateFilters({ operatorSellerIds, page: 1 })}
										onClear={() => updateFilters({ operatorSellerIds: [], page: 1 })}
										clearLabel="TODOS"
									/>
								</InteractiveFilter.AddFilterItem>
							</InteractiveFilter.AddFilterSection>
						</InteractiveFilter.AddFilterContent>
					</InteractiveFilter.AddFilterRoot>
				) : null}
			</div>

			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages}
				itemsMatchedText={`${transactionsMatched} ${transactionsMatched === 1 ? "transação encontrada" : "transações encontradas"}.`}
				itemsShowingText={`Mostrando ${transactions.length} ${transactions.length === 1 ? "transação" : "transações"}.`}
			/>

			{isLoading ? (
				<LoadingComponent />
			) : (
				<div className="flex flex-col gap-2">
					{transactions.length === 0 ? (
						<div className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</div>
					) : (
						transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} cashbackProgramTerminology={terminology} />)
					)}
				</div>
			)}
		</div>
	);
}

function OperatorFilter({
	options,
	value,
	onChange,
}: {
	options: InteractiveFilterOption<string>[];
	value: string[];
	onChange: (value: string[]) => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<UserRound className="h-4 w-4" />
					<InteractiveFilter.Label>OPERADORES</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveOptionSummary(options, value)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={() => onChange([])} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.MultiContent options={options} value={value} onChange={onChange} onClear={() => onChange([])} clearLabel="TODOS" />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

type TransactionCardProps = {
	transaction: TGetCashbackProgramTransactionsOutputDefault["transactions"][number];
	cashbackProgramTerminology: TCashbackProgramTerminologyEnum;
};
function TransactionCard({ transaction, cashbackProgramTerminology }: TransactionCardProps) {
	const transactionValueBadgeStyles: Record<typeof transaction.tipo, string> = {
		ACÚMULO: "bg-green-100 text-green-700 border-green-200",
		RESGATE: "bg-blue-100 text-blue-700 border-blue-200",
		EXPIRAÇÃO: "bg-red-100 text-red-700 border-red-200",
		CANCELAMENTO: "bg-gray-100 text-gray-700 border-gray-200",
	};

	const getTransactionIcon = () => {
		switch (transaction.tipo) {
			case "ACÚMULO":
				return (
					<div
						className={cn("h-10 w-10 min-h-10 min-w-10 rounded-full flex items-center justify-center border bg-green-100 border-green-200 text-green-700")}
					>
						<TrendingUp className="h-5 w-5" />
					</div>
				);
			case "RESGATE":
				return (
					<div
						className={cn(
							"relative h-10 w-10 min-h-10 min-w-10 rounded-full flex items-center justify-center border bg-blue-100 border-blue-200 text-blue-700",
						)}
					>
						{transaction.resgateRecompensa ? (
							transaction.resgateRecompensa.imagemCapaUrl ? (
								<Image src={transaction.resgateRecompensa.imagemCapaUrl} alt={transaction.resgateRecompensa.titulo} fill />
							) : (
								<Gift className="h-5 w-5" />
							)
						) : (
							<TrendingDown className="h-5 w-5" />
						)}
					</div>
				);
		}
		return (
			<div className={cn("h-10 w-10 min-h-10 min-w-10 rounded-full flex items-center justify-center border bg-red-100 border-red-200 text-red-700")}>
				<History className="h-5 w-5" />
			</div>
		);
	};
	const transactionIcon = useMemo(() => getTransactionIcon(), [transaction.tipo]);
	const transactionValueBadge = `${transaction.tipo === "RESGATE" ? "-" : "+"} ${formatCashbackValue(Math.abs(transaction.valor), cashbackProgramTerminology)}`;
	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 transition-colors cursor-pointer group">
					{transactionIcon}

					<div className="flex-1 flex flex-col gap-1 min-w-0">
						<span className="text-sm font-medium truncate">{transaction.cliente.nome}</span>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<div className="flex items-center gap-1.5 min-w-0">
								<UserRound className="h-3 w-3 min-h-3 min-w-3 shrink-0" />
								<span className="text-xs font-medium truncate">{transaction.operadorVendedor?.nome ?? "Sistema"}</span>
							</div>
							<span className="shrink-0">{formatDateAsLocale(transaction.dataInsercao, true)}</span>
							{transaction.expiracaoData && <span className="shrink-0">• Expira: {formatDateAsLocale(transaction.expiracaoData, true)}</span>}
						</div>
					</div>

					<span
						className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold shrink-0", transactionValueBadgeStyles[transaction.tipo])}
					>
						{transactionValueBadge}
					</span>
				</div>
			</HoverCardTrigger>
			<HoverCardContent className="w-80 overflow-hidden p-4 flex flex-col gap-3" align="start">
				<div className="w-full flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"h-10 w-10 min-h-10 min-w-10 rounded-full flex items-center justify-center border",
								transaction.tipo === "ACÚMULO"
									? "bg-green-100 border-green-200 text-green-700"
									: transaction.tipo === "RESGATE"
										? "bg-blue-100 border-blue-200 text-blue-700"
										: "bg-red-100 border-red-200 text-red-700",
							)}
						>
							{transaction.tipo === "ACÚMULO" ? (
								<TrendingUp className="h-5 w-5" />
							) : transaction.tipo === "RESGATE" ? (
								<TrendingDown className="h-5 w-5" />
							) : (
								<History className="h-5 w-5" />
							)}
						</div>
						<div>
							<p className="text-sm font-bold">{transaction.tipo}</p>
							<p className="text-xs text-muted-foreground">{formatDateAsLocale(transaction.dataInsercao)}</p>
						</div>
						<div className="ml-auto">
							<span className={cn("text-sm font-bold", transaction.tipo === "RESGATE" ? "text-red-600" : "text-green-600")}>
								{transaction.tipo === "RESGATE" ? "-" : "+"} {formatCashbackValue(Math.abs(transaction.valor), cashbackProgramTerminology)}
							</span>
						</div>
					</div>
					<div className="pt-4 w-full flex flex-col gap-1.5 border-t">
						<div className="flex items-center justify-between gap-1.5">
							<span className="text-xs text-muted-foreground">DATA DA OPERAÇÃO</span>
							<span className="text-xs font-medium text-right">{formatDateAsLocale(transaction.dataInsercao, true)}</span>
						</div>
						<div className="flex items-center justify-between gap-1.5">
							<span className="text-xs text-muted-foreground">CLIENTE</span>
							<span className="text-xs font-medium text-right">{transaction.cliente.nome}</span>
						</div>

						{transaction.venda && (
							<>
								<div className="flex items-center justify-between gap-1.5">
									<span className="text-xs text-muted-foreground">VENDA</span>
									<span className="text-xs font-medium trucate text-end">#{transaction.venda.id}</span>
								</div>
								<div className="flex items-center justify-between gap-1.5">
									<span className="text-xs text-muted-foreground">VALOR DA VENDA</span>
									<span className="text-xs font-medium truncate text-end">{formatToMoney(transaction.venda.valorTotal)}</span>
								</div>
								{transaction.venda.canal && (
									<div className="flex items-center justify-between gap-1.5">
										<span className="text-xs text-muted-foreground">CANAL</span>
										<span className="text-xs font-medium truncate text-end">{transaction.venda.canal}</span>
									</div>
								)}
								{transaction.operadorVendedor && (
									<div className="flex items-center justify-between gap-1.5">
										<span className="text-xs text-muted-foreground">VENDEDOR</span>
										<span className="text-xs font-medium truncate text-end">{transaction.operadorVendedor.nome}</span>
									</div>
								)}
								{transaction.resgateRecompensa ? (
									<div className="flex items-center justify-between gap-1.5">
										<span className="text-xs text-muted-foreground">RESGATE</span>
										<span className="text-xs font-medium truncate text-end">{transaction.resgateRecompensa.titulo}</span>
									</div>
								) : null}
							</>
						)}
					</div>
				</div>
				{transaction.venda && (
					<div className="pt-4 flex items-center justify-center">
						<Button size="sm" variant="ghost" className="w-full gap-2" asChild>
							<Link href={appRoutes.sales.details(transaction.venda.id)}>
								VER VENDA
								<ArrowUpRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				)}
			</HoverCardContent>
		</HoverCard>
	);
}
