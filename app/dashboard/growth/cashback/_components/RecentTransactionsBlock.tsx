"use client";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { formatCashbackValue, formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useCashbackProgramTransactions } from "@/lib/queries/cashback-programs";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ChevronLeft, ChevronRight, Filter, Gift, History, RotateCcw, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TCashbackProgramTransactionsOutputDefault } from "@/app/api/cashback-programs/transactions/route";
import Image from "next/image";

type RecentTransactionsBlockProps = {
	period?: { after: string; before: string };
	terminology: TCashbackProgramTerminologyEnum;
};

type TTransactionTypeFilter = "ACÚMULO" | "RESGATE" | "EXPIRAÇÃO" | undefined;

function parsePeriod(period?: RecentTransactionsBlockProps["period"]): { after?: Date; before?: Date } {
	return {
		after: period?.after ? new Date(period.after) : undefined,
		before: period?.before ? new Date(period.before) : undefined,
	};
}

export default function RecentTransactionsBlock({ period, terminology }: RecentTransactionsBlockProps) {
	const [page, setPage] = useState(1);
	const [filterType, setFilterType] = useState<TTransactionTypeFilter>(undefined);
	const [filterPopoverIsOpen, setFilterPopoverIsOpen] = useState(false);
	const [appliedPeriod, setAppliedPeriod] = useState(period);
	const [appliedOperatorId, setAppliedOperatorId] = useState<string>();
	const [draftPeriod, setDraftPeriod] = useState(() => parsePeriod(period));
	const [draftOperatorId, setDraftOperatorId] = useState("ALL");
	const limit = 10;

	const { data, isLoading } = useCashbackProgramTransactions({
		period: appliedPeriod,
		page,
		limit,
		type: filterType,
		operadorVendedorId: appliedOperatorId,
	});

	const transactions = data?.transactions || [];
	const totalPages = data?.totalPages ?? 0;
	const transactionsMatched = data?.transactionsMatched ?? 0;

	const canGoPrevious = page > 1;
	const canGoNext = totalPages > 0 ? page < totalPages : false;
	const appliedOperatorName =
		appliedOperatorId === "SISTEMA" ? "Sistema / automático" : data?.operadores.find((operator) => operator.id === appliedOperatorId)?.nome;
	const activeFilterCount = (appliedPeriod ? 1 : 0) + (appliedOperatorId ? 1 : 0);

	useEffect(() => {
		setAppliedPeriod(period);
		setDraftPeriod(parsePeriod(period));
		setPage(1);
	}, [period?.after, period?.before]);

	function handlePopoverChange(open: boolean) {
		setFilterPopoverIsOpen(open);
		if (open) {
			setDraftPeriod(parsePeriod(appliedPeriod));
			setDraftOperatorId(appliedOperatorId ?? "ALL");
		}
	}

	function applyAdvancedFilters() {
		if (!draftPeriod.after || !draftPeriod.before) return;
		setAppliedPeriod({
			after: draftPeriod.after.toISOString(),
			before: draftPeriod.before.toISOString(),
		});
		setAppliedOperatorId(draftOperatorId === "ALL" ? undefined : draftOperatorId);
		setPage(1);
		setFilterPopoverIsOpen(false);
	}

	function resetAdvancedFilters() {
		setAppliedPeriod(period);
		setAppliedOperatorId(undefined);
		setDraftPeriod(parsePeriod(period));
		setDraftOperatorId("ALL");
		setPage(1);
		setFilterPopoverIsOpen(false);
	}

	return (
		<div className="bg-card border-border flex h-full w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<h1 className="text-xs font-medium tracking-tight uppercase">TRANSAÇÕES RECENTES</h1>
						<p className="mt-1 truncate text-[11px] text-muted-foreground">
							{transactionsMatched} {transactionsMatched === 1 ? "registro" : "registros"}
							{appliedOperatorName ? ` · ${appliedOperatorName}` : ""}
						</p>
					</div>
					<Popover open={filterPopoverIsOpen} onOpenChange={handlePopoverChange}>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs">
								<Filter className="h-3.5 w-3.5" />
								FILTROS
								{activeFilterCount > 0 ? (
									<span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
										{activeFilterCount}
									</span>
								) : null}
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-[min(92vw,440px)] space-y-4 rounded-xl p-4">
							<div>
								<p className="text-sm font-semibold">Filtrar histórico</p>
								<p className="text-xs text-muted-foreground">Refine os registros por período e operador.</p>
							</div>
							<DateIntervalInput label="PERÍODO" value={draftPeriod} handleChange={setDraftPeriod} />
							<div className="space-y-1.5">
								<label className="text-sm font-medium tracking-tight text-foreground/80">OPERADOR</label>
								<Select value={draftOperatorId} onValueChange={setDraftOperatorId}>
									<SelectTrigger className="w-full rounded-md bg-background">
										<SelectValue placeholder="Todos os operadores" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">Todos os operadores</SelectItem>
										<SelectItem value="SISTEMA">Sistema / automático</SelectItem>
										{data?.operadores.map((operator) => (
											<SelectItem key={operator.id} value={operator.id}>
												{operator.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center justify-between gap-2 border-t pt-3">
								<Button variant="ghost" size="sm" className="gap-1.5" onClick={resetAdvancedFilters}>
									<RotateCcw className="h-3.5 w-3.5" />
									REDEFINIR
								</Button>
								<Button size="sm" onClick={applyAdvancedFilters} disabled={!draftPeriod.after || !draftPeriod.before}>
									APLICAR FILTROS
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<div className="flex items-center gap-1 overflow-x-auto pb-0.5">
					<Button
						variant={!filterType ? "secondary" : "ghost"}
						size="sm"
						className="h-7 text-xs px-2"
						onClick={() => {
							setFilterType(undefined);
							setPage(1);
						}}
					>
						TODAS
					</Button>
					<Button
						variant={filterType === "ACÚMULO" ? "secondary" : "ghost"}
						size="sm"
						className="h-7 text-xs px-2"
						onClick={() => {
							setFilterType("ACÚMULO");
							setPage(1);
						}}
					>
						ACÚMULO
					</Button>
					<Button
						variant={filterType === "RESGATE" ? "secondary" : "ghost"}
						size="sm"
						className="h-7 text-xs px-2"
						onClick={() => {
							setFilterType("RESGATE");
							setPage(1);
						}}
					>
						RESGATE
					</Button>
					<Button
						variant={filterType === "EXPIRAÇÃO" ? "secondary" : "ghost"}
						size="sm"
						className="h-7 text-xs px-2"
						onClick={() => {
							setFilterType("EXPIRAÇÃO");
							setPage(1);
						}}
					>
						EXPIRAÇÃO
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				{isLoading ? (
					<div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
				) : transactions.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</div>
				) : (
					transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} cashbackProgramTerminology={terminology} />)
				)}
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2 border-t border-border">
					<div className="text-xs text-muted-foreground">
						Página {page} de {totalPages} ({transactionsMatched} transações)
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!canGoPrevious}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

type TransactionCardProps = {
	transaction: TCashbackProgramTransactionsOutputDefault["transactions"][number];
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
